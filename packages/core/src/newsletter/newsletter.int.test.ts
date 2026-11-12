import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestEnv } from "../testing/factory";
import { firstIssueDate, formatIssueDay, linkToken, openLink, resendLink, savePreferences, subscribe } from "./index";

// India H₂ Weekly with double opt-in (step 5.1, A46): a sign-up stays pending until the emailed link is opened; signing
// up again when confirmed sends a change-topics link; links expire after 48 hours and only the latest one works.
const url = process.env.TEST_DATABASE_URL;

describe("first issue date", () => {
  it("is the Monday after the India calendar day", () => {
    // Thursday 12 Nov 2026, 8:12 PM IST → Monday 16 November.
    expect(formatIssueDay(firstIssueDate(new Date("2026-11-12T14:42:00Z")))).toBe("Monday 16 November");
    // A Monday sign-up waits for the next Monday.
    expect(formatIssueDay(firstIssueDate(new Date("2026-11-16T03:00:00Z")))).toBe("Monday 23 November");
    // Sunday late evening IST is already Monday's eve: the next day.
    expect(formatIssueDay(firstIssueDate(new Date("2026-11-15T17:00:00Z")))).toBe("Monday 16 November");
  });
});

describe.skipIf(!url)("newsletter sign-up", () => {
  let h: DbHandle;
  const email = `weekly-${String(Date.now())}@example.org`;
  const row = async () =>
    (await h.db.select().from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, email)))[0];

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("refuses an incomplete address", async () => {
    await expect(subscribe({ email: "ravi.k@greenfieldh2", topics: [], source: "test" })).rejects.toThrow(
      "Enter a full email address, like name@company.in",
    );
  });

  it("keeps a sign-up pending until the link is opened, then confirms once", async () => {
    expect(await subscribe({ email: email.toUpperCase(), topics: ["news", "jobs", "unknown"], source: "test" })).toBe(
      "sent",
    );
    const pending = await row();
    expect(pending).toMatchObject({ status: "pending", topics: ["news", "jobs"], source: "test" });
    expect(pending?.consentVersion).toMatch(/^newsletter-/);

    const token = linkToken(pending?.id ?? "", "confirm", pending?.linkNonce ?? "", Date.now() + 60_000);
    const opened = await openLink(token);
    expect(opened.ok && opened.link.justConfirmed).toBe(true);
    expect((await row())?.status).toBe("confirmed");
    const again = await openLink(token);
    expect(again.ok && again.link.justConfirmed).toBe(false);

    expect(await savePreferences(token, { topics: ["policy"], tenderDigest: true, monthlyNote: false })).toBe(true);
    expect(await row()).toMatchObject({ topics: ["policy"], tenderDigest: true, monthlyNote: false });
  });

  it("sends a change-topics link to a confirmed address, and the old link stops working", async () => {
    const before = await row();
    const old = linkToken(before?.id ?? "", "confirm", before?.linkNonce ?? "", Date.now() + 60_000);
    expect(await subscribe({ email, topics: ["news"], source: "test" })).toBe("already");
    expect((await row())?.topics).toEqual(["policy"]); // unchanged until they choose
    expect(await openLink(old)).toEqual({ ok: false, reason: "replaced" });
    await resendLink(email);
  });

  it("tells an expired link from a forged one", async () => {
    const r = await row();
    expect(await openLink(linkToken(r?.id ?? "", "manage", r?.linkNonce ?? "", Date.now() - 1000))).toEqual({
      ok: false,
      reason: "expired",
    });
    const forged = `${linkToken(r?.id ?? "", "manage", r?.linkNonce ?? "", Date.now() + 60_000).slice(0, -3)}abc`;
    expect(await openLink(forged)).toEqual({ ok: false, reason: "invalid" });
  });
});
