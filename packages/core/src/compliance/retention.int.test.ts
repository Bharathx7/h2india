import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeUser, useTestEnv } from "../testing/factory";
import { RETENTION, runRetention } from "./retention";

// Step 12.2, "the retention job runs in dry-run mode and reports what it would remove"; it acts only once a period
// is set and enforcement is switched on.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("retention (step 12.2)", () => {
  let h: DbHandle;
  let sessionId = "";
  let subscriberId = "";

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 2 });
    await h.db.delete(schema.settings).where(eq(schema.settings.key, RETENTION.key));
    const user = await makeUser(h.db, "Retention");
    const [s] = await h.db
      .insert(schema.sessions)
      .values({
        token: randomBytes(16).toString("hex"),
        userId: user.id,
        expiresAt: new Date(Date.now() - 400 * 86_400_000),
        ipAddress: "203.0.113.9",
      })
      .returning();
    sessionId = s?.id ?? "";
    const [n] = await h.db
      .insert(schema.newsletterSubscribers)
      .values({
        email: `gone-${randomBytes(4).toString("hex")}@example.com`,
        status: "unsubscribed",
        source: "footer",
        consentVersion: "test",
        linkNonce: "x",
        unsubscribedAt: new Date(Date.now() - 400 * 86_400_000),
      })
      .returning();
    subscriberId = n?.id ?? "";
  });
  afterAll(async () => {
    await h.db.delete(schema.settings).where(eq(schema.settings.key, RETENTION.key));
    await h.pool.end();
  });

  const exists = async () =>
    (await h.db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId))).length === 1;

  it("reports without a period and removes nothing", async () => {
    const r = await runRetention(h.db, { apply: true });
    const line = r.lines.find((l) => l.rule === "sessions-expired");
    expect(r.applied).toBe(false);
    expect(line?.days).toBeNull();
    expect(line?.due).toBeNull();
    expect(line?.ended).toBeGreaterThanOrEqual(1);
    expect(await exists()).toBe(true);
  });

  it("a what-if period counts the rows but never acts", async () => {
    const r = await runRetention(h.db, { apply: true, periods: { "sessions-expired": 365 } });
    expect(r.applied).toBe(false);
    expect(r.lines.find((l) => l.rule === "sessions-expired")?.due).toBeGreaterThanOrEqual(1);
    expect(await exists()).toBe(true);
  });

  it("acts only with a period and enforcement on, and audits it", async () => {
    await h.db.insert(schema.settings).values({
      key: RETENTION.key,
      value: { enforce: false, days: { "sessions-expired": 365 } },
    });
    expect((await runRetention(h.db, { apply: true })).applied).toBe(false);
    expect(await exists()).toBe(true);

    await h.db
      .update(schema.settings)
      .set({ value: { enforce: true, days: { "sessions-expired": 365, "newsletter-unsubscribed": 365 } } })
      .where(eq(schema.settings.key, RETENTION.key));
    const r = await runRetention(h.db, { apply: true });
    expect(r.applied).toBe(true);
    expect(r.lines.find((l) => l.rule === "sessions-expired")?.changed).toBeGreaterThanOrEqual(1);
    expect(await exists()).toBe(false);
    const [sub] = await h.db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.id, subscriberId));
    expect(sub?.email).toMatch(/^erased-.*@erased\.invalid$/);
    // Rules without a period stay untouched.
    expect(r.lines.filter((l) => l.days === null).every((l) => l.changed === 0)).toBe(true);
  });
});
