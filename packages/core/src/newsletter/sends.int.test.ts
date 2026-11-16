import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { runDeadlines } from "../clocks/clocks";
import { makeUser, useTestEnv } from "../testing/factory";
import { saveSend, scheduleSend, sendBatch, sendFor, sendStats, NewsletterSendError } from "./sends";

// Step 11.3 DONE WHEN: a scheduled issue sends at the set IST time to confirmed subscribers only (and each once).
const url = process.env.TEST_DATABASE_URL;
const mail = process.env.MAILPIT_URL;
const content = {
  title: "H2 Economy Weekly #5",
  masthead: "H2 Economy Weekly · #5",
  sections: [{ heading: "Top stories", items: [{ title: "Story", href: "https://example.org/a", meta: "Analysis" }] }],
};

describe.skipIf(!url || !mail)("newsletter sends", () => {
  let h: DbHandle;
  let editor: Actor;
  const tag = randomBytes(3).toString("hex");
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    const u = await makeUser(h.db, "Newsletter editor");
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Content editor")));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    editor = await loadActor(h.db, u.id);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("sends at the set time to confirmed subscribers only, each once", async () => {
    const make = (status: string) =>
      h.db
        .insert(schema.newsletterSubscribers)
        .values({
          email: `${status}-${tag}-${randomBytes(2).toString("hex")}@example.com`,
          status,
          source: "test",
          consentVersion: "t",
          linkNonce: "n",
        })
        .returning();
    const [confirmed] = await make("confirmed");
    const [pending] = await make("pending");
    const [gone] = await make("unsubscribed");
    const issueId = `90${tag.replace(/\D/g, "1")}`;
    await saveSend(h.db, editor, {
      issueId,
      subject: "Green ammonia bids",
      preview: "Plus a chart",
      editorNote: "Hello",
    });
    await expect(scheduleSend(h.db, editor, issueId, new Date(Date.now() - 60_000))).rejects.toBeInstanceOf(
      NewsletterSendError,
    );
    const at = new Date(Date.now() + 3_600_000);
    await scheduleSend(h.db, editor, issueId, at);
    const send = await sendFor(h.db, issueId);
    expect(send?.status).toBe("Scheduled");
    // Not yet due: nothing goes.
    expect(await sendBatch(h.db, send?.id ?? "", content)).toBe(0);
    await runDeadlines(h.db, new Date(at.getTime() + 1000));
    expect((await sendFor(h.db, issueId))?.status).toBe("Due");
    // Batches until everyone confirmed has it; the rerun sends nobody twice.
    let total = 0;
    for (let i = 0; i < 50 && (await sendFor(h.db, issueId))?.status !== "Sent"; i++)
      total += await sendBatch(h.db, send?.id ?? "", content, 500);
    expect((await sendFor(h.db, issueId))?.status).toBe("Sent");
    const got = await h.db
      .select()
      .from(schema.newsletterDeliveries)
      .where(eq(schema.newsletterDeliveries.sendId, send?.id ?? ""));
    const ids = got.map((g) => g.subscriberId);
    expect(ids).toContain(confirmed?.id);
    expect(ids).not.toContain(pending?.id);
    expect(ids).not.toContain(gone?.id);
    expect(total).toBe(ids.length);
    expect(await sendBatch(h.db, send?.id ?? "", content)).toBe(0);
    // Stats (647:660): sent and delivered from the deliveries; opens and clicks wait for the provider (M6); a
    // recipient who unsubscribes afterwards counts against this issue.
    await h.db
      .update(schema.newsletterSubscribers)
      .set({ status: "unsubscribed", unsubscribedAt: new Date(Date.now() + 5000) })
      .where(eq(schema.newsletterSubscribers.id, confirmed?.id ?? ""));
    const stats = await sendStats(h.db, issueId, new Date(Date.now() + 60_000));
    expect(stats).toMatchObject({ status: "Sent", sent: ids.length, delivered: total, opens: null, clicks: null });
    expect(stats?.unsubscribed).toBeGreaterThanOrEqual(1);
    await h.db
      .delete(schema.newsletterDeliveries)
      .where(inArray(schema.newsletterDeliveries.subscriberId, [confirmed?.id ?? ""]));
  });
});
