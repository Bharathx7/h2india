import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkGstin } from "./check";
import { CompanyError, createCompany, searchCompanies } from "./companies";
import { FLAG_OVERRIDES } from "../admin/system";
import { applyDraft, saveDraftMobile, startDraft, updateDraft } from "./drafts";
import { gstinCheckChar } from "./gstin";
import {
  approveJoinRequest,
  expireJoinRequests,
  JoinRequestError,
  latestJoinRequest,
  rejectJoinRequest,
  remindJoinRequest,
  requestToJoin,
} from "./join-requests";

// Step 3.3 against a real PostgreSQL (TEST_DATABASE_URL), with the fake GSTIN provider.
const url = process.env.TEST_DATABASE_URL;

/** A fresh GSTIN in the fake's active test family (PAN AAKCT + 4 digits + letter). */
function testGstin(state = "27", pan?: string): string {
  const p =
    pan ??
    `AAKCT${String(1000 + Math.floor(Math.random() * 8999))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  const first14 = `${state}${p}1Z`;
  return first14 + gstinCheckChar(first14);
}

describe.skipIf(!url)("companies and join requests", () => {
  let h: DbHandle;
  const person = async (name: string) => {
    const [u] = await h.db
      .insert(schema.users)
      .values({
        id: uuidv7(),
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}.${uuidv7()}@example.com`,
        emailVerified: true,
      })
      .returning();
    if (!u) throw new Error("no user");
    return u;
  };

  beforeAll(() => {
    // getDb() reads the settings; point it at the test database.
    Object.assign(process.env, {
      DATABASE_URL: url,
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "x".repeat(32),
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      MEILI_HOST: "http://localhost:7700",
      MEILI_MASTER_KEY: "k".repeat(16),
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "ap-south-1",
      S3_ACCESS_KEY: "test",
      S3_SECRET_KEY: "s".repeat(8),
      S3_BUCKET_PRIVATE: "private",
      S3_BUCKET_PUBLIC: "public",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
      EMAIL_FROM: "H2 Economy <test@h2india.local>",
    });
    h = createDb(url ?? "", { max: 10 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("gives each designed GSTIN state", async () => {
    expect((await checkGstin(h.db, "27AAKCG5521M1Z3")).state).toBe("invalid_format");
    expect((await checkGstin(h.db, "27AAKCN0000N1ZK")).state).toBe("not_found");
    expect(await checkGstin(h.db, "29AABCK7731F1ZH")).toMatchObject({ state: "inactive", status: "Cancelled" });
    expect(await checkGstin(h.db, "27AAKCS4410N1Z1")).toMatchObject({ state: "several", pan: "AAKCS4410N" });
    expect((await checkGstin(h.db, testGstin("27", "AAKCP1234Z"))).state).toBe("pending");
    expect(await checkGstin(h.db, testGstin())).toMatchObject({ state: "valid", stateName: "Maharashtra" });
  });

  it("stops a second company on the same GSTIN or the same PAN, never on the name", async () => {
    const owner = await person("Meera Pillai");
    const gstin = testGstin("27");
    const { organisationId } = await createCompany({ userId: owner.id, kind: "buyer", gstins: [gstin] });

    // Same GSTIN, and another state's GSTIN under the same PAN: both already registered.
    expect(await checkGstin(h.db, gstin)).toMatchObject({ state: "already_registered", organisationId, members: 1 });
    expect(await checkGstin(h.db, testGstin("24", gstin.slice(2, 12)))).toMatchObject({
      state: "already_registered",
      organisationId,
    });
    const other = await person("Arjun Shah");
    await expect(createCompany({ userId: other.id, kind: "buyer", gstins: [gstin] })).rejects.toMatchObject({
      code: "ALREADY_REGISTERED",
      organisationId,
    });
    // A company with the same name but no GSTIN is allowed: names are not identities.
    const named = await createCompany({
      userId: other.id,
      kind: "buyer",
      gstins: [],
      name: `Test Hydrogen ${gstin.slice(2, 12)} Private Limited`,
    });
    expect(named.organisationId).not.toBe(organisationId);
    expect((await searchCompanies(h.db, gstin.slice(0, 8))).map((c) => c.id)).toContain(organisationId);
  });

  it("creates only one company when two people race with the same GSTIN", async () => {
    const [a, b] = await Promise.all([person("Race A"), person("Race B")]);
    const gstin = testGstin();
    const results = await Promise.allSettled([
      createCompany({ userId: a.id, kind: "buyer", gstins: [gstin] }),
      createCompany({ userId: b.id, kind: "buyer", gstins: [gstin] }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect((rejected?.reason as CompanyError).code).toBe("ALREADY_REGISTERED");
  });

  it("keeps suppliers to active GSTINs and asks for a name when the portal has none", async () => {
    const p = await person("Kaveri Supplier");
    await expect(createCompany({ userId: p.id, kind: "supplier", gstins: ["29AABCK7731F1ZH"] })).rejects.toMatchObject({
      code: "SUPPLIER_NEEDS_ACTIVE_GSTIN",
    });
    await expect(createCompany({ userId: p.id, kind: "buyer", gstins: [] })).rejects.toMatchObject({
      code: "NAME_REQUIRED",
    });
  });

  it("creates a company with one GSTIN only (founder QC, 17 Nov 2026, A189)", async () => {
    const p = await person("Two Gstins");
    await expect(
      createCompany({ userId: p.id, kind: "buyer", gstins: [testGstin("27"), testGstin("24")] }),
    ).rejects.toMatchObject({ code: "ONE_GSTIN" });
  });

  it("runs a join request from asking to approval, and only that company's admin may answer", async () => {
    const owner = await person("Owner One");
    const { organisationId } = await createCompany({ userId: owner.id, kind: "buyer", gstins: [testGstin()] });
    const stranger = await person("Other Admin");
    await createCompany({ userId: stranger.id, kind: "buyer", gstins: [testGstin()] });

    const asker = await person("Asker One");
    const first = await requestToJoin({ userId: asker.id, organisationId });
    const again = await requestToJoin({ userId: asker.id, organisationId });
    expect(again).toEqual({ id: first.id, created: false });

    // An admin of another company cannot see or answer it.
    await expect(approveJoinRequest({ adminId: stranger.id, requestId: first.id })).rejects.toMatchObject({
      code: "NOT_ALLOWED",
    });
    // One reminder a day.
    await remindJoinRequest({ userId: asker.id, requestId: first.id });
    await expect(remindJoinRequest({ userId: asker.id, requestId: first.id })).rejects.toBeInstanceOf(JoinRequestError);

    await approveJoinRequest({ adminId: owner.id, requestId: first.id });
    const view = await latestJoinRequest(asker.id);
    expect(view).toMatchObject({ status: "Approved", decidedByName: "Owner One" });
    const members = await h.db
      .select({ role: schema.memberships.role })
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, asker.id));
    expect(members).toEqual([{ role: "Requester" }]);
    const history = await h.db.execute(
      sql`SELECT from_status, to_status FROM core.status_history WHERE entity_id = ${first.id}`,
    );
    expect(history.rows).toEqual([{ from_status: "Pending", to_status: "Approved" }]);
    await expect(requestToJoin({ userId: asker.id, organisationId })).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
  });

  it("records a rejection with its reason, and expires requests after 14 days", async () => {
    const owner = await person("Owner Two");
    const { organisationId } = await createCompany({ userId: owner.id, kind: "buyer", gstins: [testGstin()] });
    const a = await person("Rejected Person");
    const ra = await requestToJoin({ userId: a.id, organisationId });
    await rejectJoinRequest({ adminId: owner.id, requestId: ra.id, reason: "Only the procurement team." });
    expect(await latestJoinRequest(a.id)).toMatchObject({ status: "Rejected", reason: "Only the procurement team." });

    const b = await person("Waiting Person");
    const rb = await requestToJoin({ userId: b.id, organisationId });
    const [row] = await h.db.select().from(schema.joinRequests).where(eq(schema.joinRequests.id, rb.id));
    expect(row && Math.round((row.expiresAt.getTime() - Date.now()) / 86_400_000)).toBe(14);
    await h.db.execute(sql`UPDATE core.join_requests SET expires_at = now() - interval '1 minute' WHERE id = ${rb.id}`);
    await expireJoinRequests(h.db);
    expect(await latestJoinRequest(b.id)).toMatchObject({ status: "Expired" });
  });

  it("copies Join details to an account only when its email is the one in the draft", async () => {
    const owner = await person("Draft Owner");
    const token = await startDraft();
    await updateDraft(token, {
      path: "member",
      email: owner.email,
      fullName: "Draft Owner",
      jobRole: "Engineering",
      termsAccepted: true,
      termsVersion: "1.1",
    });
    await h.db
      .update(schema.joinDrafts)
      .set({ mobile: "+91 98201 23456", mobileVerifiedAt: new Date() })
      .where(sql`true`);
    const someoneElse = await person("Someone Else");
    expect(await applyDraft(token, { id: someoneElse.id, email: someoneElse.email })).toBeNull();
    expect(await applyDraft(token, { id: owner.id, email: owner.email })).toMatchObject({ path: "member" });
    const [after] = await h.db.select().from(schema.users).where(eq(schema.users.id, owner.id));
    // The terms version they accepted is kept with the account (step 5.8).
    expect(after).toMatchObject({
      profileType: "member",
      jobRole: "Engineering",
      mobile: "+91 98201 23456",
      termsVersion: "1.1",
    });
  });
  // Founder, 19 Nov 2026 (A195): Join asks for no mobile and no SMS code, whatever the old mobileVerification switch
  // says; a number saved on an older draft is still copied, unverified.
  it("joins without a mobile number, with the old mobile check switched on or off", async () => {
    const setSwitch = async (on: boolean) => {
      const value = { mobileVerification: on };
      await h.db
        .insert(schema.settings)
        .values({ key: FLAG_OVERRIDES.key, value })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
    };
    const draftFor = async (who: { email: string }, mobile?: string) => {
      const token = await startDraft();
      await updateDraft(token, {
        path: "member",
        email: who.email,
        fullName: "No Mobile",
        jobRole: "Engineering",
        termsAccepted: true,
        termsVersion: "1.1",
      });
      if (mobile) await saveDraftMobile(token, mobile);
      return token;
    };
    try {
      await setSwitch(true);
      const strict = await person("Switch On");
      expect(await applyDraft(await draftFor(strict), { id: strict.id, email: strict.email })).toMatchObject({
        path: "member",
      });
      const [onRow] = await h.db.select().from(schema.users).where(eq(schema.users.id, strict.id));
      expect(onRow).toMatchObject({ profileType: "member", mobileVerifiedAt: null });

      await setSwitch(false);
      const older = await person("Older Draft");
      expect(
        await applyDraft(await draftFor(older, "+91 98201 65432"), { id: older.id, email: older.email }),
      ).toMatchObject({ path: "member" });
      const [after] = await h.db.select().from(schema.users).where(eq(schema.users.id, older.id));
      // The number is kept but not marked verified, so nothing is ever texted to it.
      expect(after).toMatchObject({ mobile: "+91 98201 65432", mobileVerifiedAt: null, profileType: "member" });
    } finally {
      await h.db.delete(schema.settings).where(eq(schema.settings.key, FLAG_OVERRIDES.key));
    }
  });
});
