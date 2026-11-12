import { schema, type Database } from "@h2india/db";
import { randomBytes } from "node:crypto";
import { uuidv7 } from "uuidv7";

// Test factory (step 3.4): two companies, each with an Admin and a Requester, for cross-company tests.
// Every new company-owned record type adds a case to authz.int.test.ts using it.

export const TEST_ENV = {
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "x".repeat(32),
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
  EMAIL_FROM: "H2 India <test@h2india.local>",
} as const;

/** Points getDb() at the test database. Call in beforeAll. */
export function useTestEnv(databaseUrl: string): void {
  Object.assign(process.env, TEST_ENV, {
    DATABASE_URL: databaseUrl,
    REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  });
}

export async function makeUser(db: Database, name: string) {
  const [user] = await db
    .insert(schema.users)
    .values({
      id: uuidv7(),
      name,
      email: `${name.toLowerCase().replace(/\W+/g, ".")}.${randomBytes(4).toString("hex")}@example.com`,
      emailVerified: true,
      profileType: "buyer",
    })
    .returning();
  if (!user) throw new Error("user insert returned nothing");
  return user;
}

export async function makeCompany(db: Database, label: string, kind: "buyer" | "supplier" = "buyer") {
  const [org] = await db
    .insert(schema.organisations)
    .values({ kind, legalName: `${label} Test Company`, verification: "Unverified" })
    .returning();
  if (!org) throw new Error("organisation insert returned nothing");
  const admin = await makeUser(db, `${label} Admin`);
  const requester = await makeUser(db, `${label} Requester`);
  await db.insert(schema.memberships).values([
    { organisationId: org.id, userId: admin.id, role: "Admin" },
    { organisationId: org.id, userId: requester.id, role: kind === "supplier" ? "Viewer" : "Requester" },
  ]);
  const [invitation] = await db
    .insert(schema.invitations)
    .values({
      organisationId: org.id,
      email: `invitee.${randomBytes(4).toString("hex")}@example.com`,
      role: "Requester",
      tokenHash: randomBytes(16).toString("hex"),
      invitedBy: admin.id,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    })
    .returning();
  if (!invitation) throw new Error("invitation insert returned nothing");
  return { org, admin, requester, invitation };
}

export async function twoCompanies(db: Database) {
  return { a: await makeCompany(db, "Alpha"), b: await makeCompany(db, "Bravo") };
}
