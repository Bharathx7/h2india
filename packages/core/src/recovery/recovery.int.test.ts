import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { hashToken } from "../companies/drafts";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import {
  claimRecoverySession,
  confirmNewEmail,
  decideRecovery,
  readRecovery,
  requestNewEmail,
  sendNewMobileCode,
  startRecovery,
  submitLostEmail,
  submitMobileChange,
  verifyFactor,
} from "./recovery";

// Step 3.5 against a real PostgreSQL. Codes are set to a known value instead of being read from the inbox.
// SMTP goes to Mailpit (localhost:1025) when it runs; sending failures would fail these tests, as they should.
const url = process.env.TEST_DATABASE_URL;
const CODE = "424242";

describe.skipIf(!url)("account recovery", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  /** Replaces every code of this recovery with CODE. */
  async function knownCodes(requestId: string) {
    await h.db
      .update(schema.verifications)
      .set({ value: `${hashToken(CODE)}:0` })
      .where(like(schema.verifications.identifier, `recovery:${requestId}:%`));
  }
  async function withMobile(userId: string, mobile: string) {
    await h.db.update(schema.users).set({ mobile, mobileVerifiedAt: new Date() }).where(eq(schema.users.id, userId));
  }
  const rand = () => `9${String(Math.floor(100_000_000 + Math.random() * 899_999_999))}`;

  it("lost passkey: one factor is refused; email and mobile codes together let the person in once", async () => {
    const { requester } = await makeCompany(h.db, "Recover");
    await withMobile(requester.id, `+91 ${rand()}`);
    const start = await startRecovery({ kind: "passkey", email: requester.email });
    const view = await readRecovery(start.token);
    if (!view) throw new Error("no recovery");
    expect(view.maskedMobile).toMatch(/^\+91 ••••• \d{5}$/);
    await knownCodes(view.id);

    await verifyFactor({ token: start.token, factor: "email", code: CODE });
    await expect(claimRecoverySession(start.token)).rejects.toMatchObject({ code: "NOT_READY" });
    await expect(verifyFactor({ token: start.token, factor: "mobile", code: "000000" })).rejects.toMatchObject({
      code: "WRONG_CODE",
    });
    await verifyFactor({ token: start.token, factor: "mobile", code: CODE });
    expect(await claimRecoverySession(start.token)).toBe(requester.id);
    await expect(claimRecoverySession(start.token)).rejects.toMatchObject({ code: "NOT_READY" });
  });

  it("changed mobile: waits for an Admin of that company; another company's Admin cannot approve", async () => {
    const a = await makeCompany(h.db, "MobileA");
    const b = await makeCompany(h.db, "MobileB");
    const start = await startRecovery({ kind: "mobile", email: a.requester.email });
    const view = await readRecovery(start.token);
    if (!view) throw new Error("no recovery");
    const newMobile = await sendNewMobileCode({ token: start.token, mobile: rand() });
    await knownCodes(view.id);
    await verifyFactor({ token: start.token, factor: "email", code: CODE });
    await verifyFactor({ token: start.token, factor: "new_mobile", code: CODE });
    expect(await submitMobileChange(start.token)).toBe("Waiting for admin");

    await expect(
      decideRecovery({ actor: await loadActor(h.db, b.admin.id), requestId: view.id, approve: true }),
    ).rejects.toMatchObject({ code: "NOT_ALLOWED" });
    await expect(
      decideRecovery({ actor: await loadActor(h.db, a.requester.id), requestId: view.id, approve: true }),
    ).rejects.toMatchObject({ code: "NOT_ALLOWED" });
    await decideRecovery({ actor: await loadActor(h.db, a.admin.id), requestId: view.id, approve: true });
    const [user] = await h.db.select().from(schema.users).where(eq(schema.users.id, a.requester.id));
    expect(user?.mobile).toBe(newMobile);
  });

  it("the company's only Admin goes to H2 Economy support, who approve with queue and user access", async () => {
    const a = await makeCompany(h.db, "SoleAdmin");
    const start = await startRecovery({ kind: "mobile", email: a.admin.email });
    const view = await readRecovery(start.token);
    if (!view) throw new Error("no recovery");
    await sendNewMobileCode({ token: start.token, mobile: rand() });
    await knownCodes(view.id);
    await verifyFactor({ token: start.token, factor: "email", code: CODE });
    await verifyFactor({ token: start.token, factor: "new_mobile", code: CODE });
    expect(await submitMobileChange(start.token)).toBe("Waiting for support");
    expect((await readRecovery(start.token))?.reference).toMatch(/^SUP-\d{4}-\d{5}$/);

    const operator = await makeUser(h.db, "Ops Person");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Operations")));
    if (!role) throw new Error("Operations role missing");
    await h.db.insert(schema.operatorRoles).values({ userId: operator.id, roleId: role.id });
    await decideRecovery({ actor: await loadActor(h.db, operator.id), requestId: view.id, approve: true });
    expect((await readRecovery(start.token))?.status).toBe("Completed");
  });

  it("lost email: mobile code, then an Admin confirms, then a new work email by link", async () => {
    const a = await makeCompany(h.db, "LostEmail");
    await withMobile(a.requester.id, `+91 ${rand()}`);
    const start = await startRecovery({ kind: "email", email: a.requester.email });
    const view = await readRecovery(start.token);
    if (!view) throw new Error("no recovery");
    await knownCodes(view.id);
    await expect(claimRecoverySession(start.token)).rejects.toMatchObject({ code: "NOT_READY" });
    await verifyFactor({ token: start.token, factor: "mobile", code: CODE });
    expect(await submitLostEmail(start.token)).toBe("Waiting for admin");
    await expect(claimRecoverySession(start.token)).rejects.toMatchObject({ code: "NOT_READY" });
    await decideRecovery({ actor: await loadActor(h.db, a.admin.id), requestId: view.id, approve: true });
    expect(await claimRecoverySession(start.token)).toBe(a.requester.id);

    const newEmail = `new.${String(Date.now())}@example.com`;
    await requestNewEmail({ userId: a.requester.id, email: newEmail });
    const token = "known-token-for-the-test-1234567";
    await h.db
      .update(schema.verifications)
      .set({ value: hashToken(token) })
      .where(eq(schema.verifications.identifier, `recovery-email:${view.id}`));
    expect(await confirmNewEmail({ requestId: view.id, token })).toBe(newEmail);
    const [user] = await h.db.select().from(schema.users).where(eq(schema.users.id, a.requester.id));
    expect(user?.email).toBe(newEmail);
  });

  it("an unknown email gets the same screen and no way in", async () => {
    const start = await startRecovery({ kind: "passkey", email: `nobody.${String(Date.now())}@example.com` });
    expect(start.maskedMobile).toBeNull();
    await expect(verifyFactor({ token: start.token, factor: "email", code: CODE })).rejects.toMatchObject({
      code: "WRONG_CODE",
    });
    await expect(claimRecoverySession(start.token)).rejects.toMatchObject({ code: "NOT_READY" });
  });
});
