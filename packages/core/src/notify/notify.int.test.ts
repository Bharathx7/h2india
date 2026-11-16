import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { sendSignInCode } from "../sign-in/mail";
import { makeUser, useTestEnv } from "../testing/factory";
import {
  deliverSms,
  sendDueDeliveries,
  setTemplateApproval,
  TemplateNotApprovedError,
  templateStatus,
} from "./channels";
import { createInApp, listNotifications, markRead, pruneNotifications, unreadCount } from "./inapp";
import { notify } from "./notify";
import { getChoices, quietUntil, setChoices, setNotifySettings } from "./preferences";

// Step 3.9 DONE WHEN: a test event produces an email in the mail catcher that matches its frame; an unapproved SMS
// template cannot be sent; the bell shows unread counts and marks all as read.
const url = process.env.TEST_DATABASE_URL;
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const ist = (s: string) => new Date(`${s}+05:30`);

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}
async function mailTo(address: string): Promise<MailpitMessage[]> {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
  return ((await res.json()) as { messages: MailpitMessage[] }).messages;
}
async function waitForMail(address: string, count = 1): Promise<MailpitMessage[]> {
  for (let i = 0; i < 40; i++) {
    const found = await mailTo(address);
    if (found.length >= count) return found;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`no mail to ${address}`);
}

describe.skipIf(!url)("notifications", () => {
  let h: DbHandle;
  const deliveries = (userId: string) =>
    h.db
      .select()
      .from(schema.notificationDeliveries)
      .where(eq(schema.notificationDeliveries.userId, userId))
      .orderBy(desc(schema.notificationDeliveries.createdAt));

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("sends the sign-in code email as drawn (671:428) and logs the delivery", async () => {
    const to = `notify.${String(Date.now())}@example.com`;
    await sendSignInCode({ to, code: "482913", name: "Ravi" });
    const [message] = await waitForMail(to);
    expect(message?.Subject).toContain("482913");
    const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message?.ID ?? ""}`)).json()) as {
      HTML: string;
      Text: string;
    };
    // The frame's parts: the wordmark header, the code, its expiry, and the footer with the reason.
    expect(full.HTML).toContain("h2economy-logo-email.png");
    expect(full.Text).toContain("482 913");
    expect(full.Text).toMatch(/10 minutes/);
    const [row] = await h.db
      .select()
      .from(schema.notificationDeliveries)
      .where(eq(schema.notificationDeliveries.recipient, to));
    expect(row).toMatchObject({ channel: "email", template: "email.sign_in_code", status: "Sent", payload: null });
  });

  it("refuses an SMS template that isn't approved, and sends it once approved", async () => {
    const boss = await makeUser(h.db, "Notify Super");
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Super admin")));
    await h.db.insert(schema.operatorRoles).values({ userId: boss.id, roleId: r?.id ?? "" });
    const actor = await loadActor(h.db, boss.id);
    const mobile = `+91 9${String(Date.now()).slice(-9)}`;
    try {
      await setTemplateApproval(h.db, actor, { template: "sms.mobile_changed", status: "Rejected" });
      expect(await templateStatus(h.db, "sms.mobile_changed")).toBe("Rejected");
      await expect(
        deliverSms({ template: "sms.mobile_changed", event: "test", userId: boss.id, to: mobile, data: {} }),
      ).rejects.toBeInstanceOf(TemplateNotApprovedError);
      expect(await mailTo(`sms-${mobile.replace(/\D/g, "")}@sms.h2india.local`)).toHaveLength(0);
      expect((await deliveries(boss.id))[0]).toMatchObject({ status: "Refused", reason: "not_approved" });
    } finally {
      await setTemplateApproval(h.db, actor, { template: "sms.mobile_changed", status: "Approved" });
    }
    await deliverSms({ template: "sms.mobile_changed", event: "test", userId: boss.id, to: mobile, data: {} });
    expect(await waitForMail(`sms-${mobile.replace(/\D/g, "")}@sms.h2india.local`)).toHaveLength(1);
    // A company admin can't approve templates.
    const other = await loadActor(h.db, (await makeUser(h.db, "Notify Nobody")).id);
    await expect(setTemplateApproval(h.db, other, { template: "sms.otp_sign_in", status: "Approved" })).rejects.toThrow(
      "Not allowed",
    );
  });

  it("shows unread counts in the bell and marks all as read, only for that person", async () => {
    const me = await makeUser(h.db, "Bell Person");
    const someone = await makeUser(h.db, "Bell Other");
    for (const title of ["Hydrotek Systems sent a quote", "ORD-2026-0091 is waiting", "Order shipped"]) {
      await createInApp(h.db, { userId: me.id, event: "test", category: "quotes", icon: "file-text", title });
    }
    await createInApp(h.db, {
      userId: someone.id,
      event: "test",
      category: "orders",
      icon: "truck",
      title: "Not yours",
    });
    expect(await unreadCount(h.db, me.id)).toBe(3);
    const list = await listNotifications(h.db, me.id);
    expect(list.map((n) => n.title)).toEqual([
      "Order shipped",
      "ORD-2026-0091 is waiting",
      "Hydrotek Systems sent a quote",
    ]);
    expect(await markRead(h.db, me.id, [list[0]?.id ?? ""])).toBe(1);
    expect(await unreadCount(h.db, me.id)).toBe(2);
    expect((await listNotifications(h.db, me.id, { filter: "unread" })).length).toBe(2);
    // Someone else's id does nothing.
    const [theirs] = await listNotifications(h.db, someone.id);
    expect(await markRead(h.db, me.id, [theirs?.id ?? ""])).toBe(0);
    expect(await markRead(h.db, me.id, "all")).toBe(2);
    expect(await unreadCount(h.db, me.id)).toBe(0);
    expect(await unreadCount(h.db, someone.id)).toBe(1);
    expect((await listNotifications(h.db, me.id, { filter: "orders" })).length).toBe(0);
    expect(await pruneNotifications(h.db)).toBe(0);
  });

  it("follows each person's choices, with account email always on", async () => {
    const me = await makeUser(h.db, "Choices Person");
    const base = {
      event: "test.choice",
      userId: me.id,
      email: { template: "email.test" as const, mail: { subject: "Choice test", html: "<p>x</p>", text: "x" } },
      inApp: { category: "orders" as const, icon: "truck", title: "Order shipped" },
    };
    expect(await notify({ ...base, topic: "order.status_changed" })).toEqual({ email: "Sent", in_app: "Shown" });
    await setChoices(h.db, me.id, [
      { topic: "order.status_changed", channel: "email", enabled: false },
      { topic: "account.security", channel: "email", enabled: false },
    ]);
    expect(await notify({ ...base, topic: "order.status_changed" })).toEqual({ email: "Skipped", in_app: "Shown" });
    expect((await getChoices(h.db, me.id))["account.security"].email).toBe(true);
    expect((await notify({ ...base, topic: "account.security" })).email).toBe("Sent");
    // A company's own choices override the personal ones there (577:288).
    const org = "00000000-0000-7000-8000-000000000001";
    await setChoices(h.db, me.id, [{ topic: "order.status_changed", channel: "email", enabled: true }], org);
    expect((await notify({ ...base, topic: "order.status_changed", scope: org })).email).toBe("Sent");
    // "Unsubscribe from everything" stops alert emails, not account ones.
    await setNotifySettings(h.db, me.id, { unsubscribedAll: true });
    expect((await notify({ ...base, topic: "alert.matches" })).email).toBe("Skipped");
    expect((await notify({ ...base, topic: "account.security" })).email).toBe("Sent");
    const skipped = (await deliveries(me.id)).filter((d) => d.status === "Skipped").map((d) => d.reason);
    expect(skipped.sort()).toEqual(["preference_off", "unsubscribed"]);
  });

  it("holds in-app notifications during quiet hours", async () => {
    const settings = { quietHours: true, quietFrom: "22:00", quietTo: "07:00", unsubscribedAll: false };
    expect(quietUntil(settings, ist("2026-11-12T23:30"))).toEqual(ist("2026-11-13T07:00"));
    expect(quietUntil(settings, ist("2026-11-13T06:59"))).toEqual(ist("2026-11-13T07:00"));
    expect(quietUntil(settings, ist("2026-11-13T07:00"))).toBeNull();
    expect(quietUntil({ ...settings, quietHours: false }, ist("2026-11-12T23:30"))).toBeNull();

    const me = await makeUser(h.db, "Quiet Person");
    await setNotifySettings(h.db, me.id, { quietHours: true });
    const night = ist("2026-11-12T23:30");
    const out = await notify(
      {
        event: "test.quiet",
        topic: "order.status_changed",
        userId: me.id,
        inApp: { category: "orders", icon: "truck", title: "Late" },
      },
      night,
    );
    expect(out.in_app).toBe("Waiting");
    expect(await unreadCount(h.db, me.id, night)).toBe(0);
    expect(await unreadCount(h.db, me.id, ist("2026-11-13T07:01"))).toBe(1);
  });

  it("retries a failed email from its stored copy", async () => {
    const me = await makeUser(h.db, "Retry Person");
    const to = `retry.${String(Date.now())}@example.com`;
    await h.db.insert(schema.notificationDeliveries).values({
      event: "test.retry",
      channel: "email",
      template: "email.test",
      userId: me.id,
      recipient: to,
      status: "Failed",
      attempts: 1,
      sendAfter: new Date(Date.now() - 1000),
      payload: { subject: "Retried message", html: "<p>Retried</p>", text: "Retried" },
    });
    expect(await sendDueDeliveries()).toBeGreaterThanOrEqual(1);
    const [mail] = await waitForMail(to);
    expect(mail?.Subject).toBe("Retried message");
    expect((await deliveries(me.id))[0]).toMatchObject({ status: "Sent", attempts: 2 });
  });
});
