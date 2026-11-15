import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestEnv } from "../testing/factory";
import { alarmChecks, tellOnCall, type Alarm } from "./alarms";

// Step 13.3: the alarms see what users feel. A stuck clock and an unprocessed payment webhook go critical.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("alarms (step 13.3)", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 2 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  const state = async (key: string) => (await alarmChecks(h.db, { queues: false })).find((a) => a.key === key);

  it("goes critical when a deadline is long overdue and clears when it's processed", async () => {
    const [d] = await h.db
      .insert(schema.deadlines)
      .values({
        type: "test.alarm",
        subjectType: "test",
        subjectId: randomBytes(4).toString("hex"),
        startedAt: new Date(Date.now() - 3_600_000),
        dueAt: new Date(Date.now() - 30 * 60_000),
      })
      .returning();
    expect(await state("clocks")).toMatchObject({ ok: false, severity: "critical" });
    await h.db
      .update(schema.deadlines)
      .set({ expiredAt: new Date(), status: "Expired" })
      .where(eq(schema.deadlines.id, d?.id ?? ""));
    const after = await state("clocks");
    // Other tests may leave their own overdue deadlines; this one no longer counts.
    expect(after?.value).not.toBe("1 overdue");
  });

  it("goes critical on a payment webhook left unprocessed", async () => {
    const id = `evt_alarm_${randomBytes(4).toString("hex")}`;
    await h.db.insert(schema.paymentWebhookEvents).values({
      partner: "sim",
      eventId: id,
      type: "payment.captured",
      payload: {},
      receivedAt: new Date(Date.now() - 20 * 60_000),
    });
    expect(await state("webhooks")).toMatchObject({ ok: false, severity: "critical" });
    await h.db
      .update(schema.paymentWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.paymentWebhookEvents.eventId, id));
  });

  it("reports every check with its runbook", async () => {
    const all = await alarmChecks(h.db, { queues: false });
    expect(all.map((a) => a.key)).toEqual(
      expect.arrayContaining([
        "clocks",
        "webhooks",
        "reconciliation",
        "payouts",
        "ledger",
        "dead-letters",
        "messages",
        "sign-in",
      ]),
    );
    expect(all.every((a) => a.runbook.startsWith("docs/runbooks/"))).toBe(true);
  });

  it("tells on-call once when an alarm starts failing, not on every check", async () => {
    const id = `evt_oncall_${randomBytes(4).toString("hex")}`;
    // Start from a known state: whatever is failing now has been told already.
    await tellOnCall(h.db, () => Promise.resolve(), { to: "ops@example.com", queues: false });
    await h.db.insert(schema.paymentWebhookEvents).values({
      partner: "sim",
      eventId: id,
      type: "payment.captured",
      payload: {},
      receivedAt: new Date(Date.now() - 20 * 60_000),
    });
    const sent: { to: string[]; failing: Alarm[] }[] = [];
    const send = (to: string[], failing: Alarm[]) => {
      sent.push({ to, failing });
      return Promise.resolve();
    };
    const opts = { to: "ops@example.com, oncall@example.com", queues: false };
    const first = await tellOnCall(h.db, send, opts);
    expect(first).toBe("sent");
    expect(sent[0]?.to).toEqual(["ops@example.com", "oncall@example.com"]);
    expect(sent[0]?.failing.map((a) => a.key)).toContain("webhooks");
    expect(await tellOnCall(h.db, send, opts)).toBe("quiet");
    expect(sent).toHaveLength(1);
    await h.db
      .update(schema.paymentWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.paymentWebhookEvents.eventId, id));
  });
});
