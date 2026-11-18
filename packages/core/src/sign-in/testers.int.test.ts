import { setFlagOverrides } from "@h2india/config";
import { createDb, schema, type DbHandle } from "@h2india/db";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { SIGN_IN_ERROR } from "./rules";
import { isStaffSession } from "./step-up";
import { FLAG_OVERRIDES } from "../admin/system";
import { isTesterEmail, TESTER_ACCOUNTS } from "./testers";

// Test accounts (founder, 18 Nov 2026) against a real PostgreSQL (TEST_DATABASE_URL): the password sign-in takes a
// listed tester only while testerSignIn is on, and a tester's session is never a staff session.
const url = process.env.TEST_DATABASE_URL;
const PASSWORD = "tester-password-0123456789";

describe.skipIf(!url)("test-account password sign-in", () => {
  let h: DbHandle;
  let auth: ReturnType<typeof createAuth>;

  const person = async (label: string) => {
    const email = `${label}.${uuidv7()}@example.com`;
    const id = uuidv7();
    await h.db.insert(schema.users).values({ id, name: label, email, emailVerified: true, profileType: "buyer" });
    await h.db
      .insert(schema.accounts)
      .values({ accountId: id, providerId: "credential", userId: id, password: await hashPassword(PASSWORD) });
    return email;
  };
  const listTesters = async (emails: string[]) => {
    await h.db
      .insert(schema.settings)
      .values({ key: TESTER_ACCOUNTS.key, value: emails })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: emails } });
  };
  // The switch as System settings saves it: in the database, not in this process's copy (founder report, 18 Nov 2026).
  const setSwitch = async (on: boolean) => {
    const value = { testerSignIn: on };
    await h.db
      .insert(schema.settings)
      .values({ key: FLAG_OVERRIDES.key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  };
  const signIn = (email: string, password = PASSWORD) =>
    auth.api.signInEmail({ body: { email, password }, headers: new Headers({ "x-forwarded-for": "10.9.9.9" }) });

  beforeAll(() => {
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
    h = createDb(url ?? "", { max: 5 });
    auth = createAuth();
  });
  afterEach(async () => {
    setFlagOverrides({});
    await h.db.delete(schema.settings).where(eq(schema.settings.key, TESTER_ACCOUNTS.key));
    await h.db.delete(schema.settings).where(eq(schema.settings.key, FLAG_OVERRIDES.key));
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("signs in a listed tester only while the switch is on, and never as staff", async () => {
    const tester = await person("tester");
    await listTesters([tester]);

    await setSwitch(false);
    expect(await isTesterEmail(h.db, tester)).toBe(false);
    await expect(signIn(tester)).rejects.toMatchObject({ body: { code: SIGN_IN_ERROR.wrongPassword } });

    await setSwitch(true);
    expect(await isTesterEmail(h.db, tester)).toBe(true);
    const result = await signIn(tester);
    expect(result.token).toBeTruthy();
    const [session] = await h.db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(eq(schema.sessions.token, result.token));
    expect(session).toBeDefined();
    expect(await isStaffSession(h.db, session?.id ?? "")).toBe(false);
  });

  it("follows the switch saved in System settings even when this process's copy says off", async () => {
    const tester = await person("saved");
    await listTesters([tester]);
    setFlagOverrides({ testerSignIn: false });
    await setSwitch(true);
    expect(await isTesterEmail(h.db, tester)).toBe(true);
    expect((await signIn(tester)).token).toBeTruthy();
    await setSwitch(false);
    expect(await isTesterEmail(h.db, tester)).toBe(false);
  });

  it("refuses a password from anyone who is neither staff nor on the list", async () => {
    await setSwitch(true);
    const tester = await person("listed");
    const other = await person("other");
    await listTesters([tester]);
    expect(await isTesterEmail(h.db, other)).toBe(false);
    await expect(signIn(other)).rejects.toMatchObject({ body: { code: SIGN_IN_ERROR.wrongPassword } });
  });

  it("counts a tester's wrong password like any other", async () => {
    await setSwitch(true);
    const tester = await person("wrong");
    await listTesters([tester]);
    await expect(signIn(tester, "not-the-password-at-all")).rejects.toMatchObject({
      body: { code: SIGN_IN_ERROR.wrongPassword, triesLeft: 4 },
    });
  });
});
