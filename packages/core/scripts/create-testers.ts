import { schema } from "@h2india/db";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { audit } from "../src/audit";
import { createCompany, membershipsOf } from "../src/companies/companies";
import { applyDraft, discardDraft, markMobileVerified, startDraft, updateDraft } from "../src/companies/drafts";
import { gstinCheckChar } from "../src/companies/gstin";
import type { JoinPath } from "../src/companies/rules";
import { getDb } from "../src/db";
import { normaliseEmail } from "../src/sign-in/rules";
import { TESTER_ACCOUNTS } from "../src/sign-in/testers";

// Shared test accounts (founder, 18 Nov 2026; docs/runbooks/deploy.md "Test accounts"):
//   pnpm testers:create <buyer-email> <supplier-email> <member-email>
// Makes (or reuses) a buyer with a buyer company, a supplier with a supplier company and a member, through the same
// core steps Join uses (draft, apply, createCompany with a fake-provider test GSTIN). Sets ONE new random password for
// all three, puts the three emails on the sign-in.testers list (audited) and prints the password once. Running it again
// replaces the password. Testers sign in at /sign-in/test while the testerSignIn switch is on.

const args = process.argv.slice(2).map((e) => normaliseEmail(e));
const [buyer = "", supplier = "", member = ""] = args;
if (args.length !== 3 || ![buyer, supplier, member].every((e) => e.includes("@")) || new Set(args).size !== 3) {
  console.error("Usage: pnpm testers:create <buyer-email> <supplier-email> <member-email> (three different emails)");
  process.exit(1);
}

const u = schema.users;
const accounts = schema.accounts;
const db = getDb();

/** Test GSTINs from the fake provider (docs/runbooks/test-gstins.md: PAN AAKCT + 4 digits + a letter, Maharashtra). */
function testGstin(digits: string, letter: string): string {
  const first14 = `27AAKCT${digits}${letter}1Z`;
  return first14 + gstinCheckChar(first14);
}

const PEOPLE: { email: string; path: JoinPath; name: string; mobile: string; gstin?: string }[] = [
  { email: buyer, path: "buyer", name: "Test Buyer", mobile: "+919000000001", gstin: testGstin("9001", "B") },
  { email: supplier, path: "supplier", name: "Test Supplier", mobile: "+919000000002", gstin: testGstin("9002", "S") },
  { email: member, path: "member", name: "Test Member", mobile: "+919000000003" },
];

async function ensureUser(email: string, name: string): Promise<string> {
  const [found] = await db.select({ id: u.id }).from(u).where(eq(u.email, email));
  if (found) return found.id;
  const [made] = await db.insert(u).values({ email, name, emailVerified: true }).returning({ id: u.id });
  if (!made) throw new Error(`Could not create ${email}`);
  return made.id;
}

async function ensureJoined(p: (typeof PEOPLE)[number], userId: string) {
  const [row] = await db.select({ profileType: u.profileType }).from(u).where(eq(u.id, userId));
  if (!row?.profileType) {
    const token = await startDraft();
    await updateDraft(token, {
      path: p.path,
      email: p.email,
      fullName: p.name,
      jobRole: "Other",
      termsAccepted: true,
      termsVersion: "test-account",
    });
    await markMobileVerified(db, token, p.mobile);
    const applied = await applyDraft(token, { id: userId, email: p.email });
    await discardDraft(token);
    if (!applied) throw new Error(`Could not finish Join for ${p.email}`);
  }
  if (p.path !== "member" && p.gstin && (await membershipsOf(db, userId)).length === 0) {
    await createCompany({ userId, kind: p.path, gstins: [p.gstin] });
  }
}

async function setPassword(userId: string, hash: string) {
  const where = and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"));
  const [found] = await db.select({ id: accounts.id }).from(accounts).where(where);
  if (found) await db.update(accounts).set({ password: hash, updatedAt: new Date() }).where(eq(accounts.id, found.id));
  else await db.insert(accounts).values({ accountId: userId, providerId: "credential", userId, password: hash });
}

const password = randomBytes(18).toString("base64url"); // 24 characters
const hash = await hashPassword(password);
for (const p of PEOPLE) {
  const userId = await ensureUser(p.email, p.name);
  await ensureJoined(p, userId);
  await setPassword(userId, hash);
}

const emails = PEOPLE.map((p) => p.email);
await db.transaction(async (tx) => {
  const [row] = await tx
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, TESTER_ACCOUNTS.key))
    .for("update");
  await tx
    .insert(schema.settings)
    .values({ key: TESTER_ACCOUNTS.key, value: emails, updatedBy: null })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: emails, updatedBy: null, updatedAt: new Date() },
    });
  await audit(tx, {
    actorId: null,
    action: "setting.change",
    resourceType: "setting",
    resourceId: TESTER_ACCOUNTS.key,
    before: { value: row ? row.value : TESTER_ACCOUNTS.fallback, saved: Boolean(row) },
    after: { value: emails },
    reason: "pnpm testers:create (test accounts and a new shared password)",
  });
});

console.log(`Test accounts ready. Sign in at /sign-in/test on the public site.

  Buyer:    ${buyer}
  Supplier: ${supplier}
  Member:   ${member}
  Password: ${password}

The password is shown only now. Sign-in works only while the "Test account sign-in" switch is on
(admin System settings, or FLAG_TESTER_SIGN_IN=true). Turn it off after testing.`);
process.exit(0);
