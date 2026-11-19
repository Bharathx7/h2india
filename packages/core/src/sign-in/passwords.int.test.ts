import { createDb, schema, type DbHandle } from "@h2india/db";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { startDraft, updateDraft } from "../companies/drafts";
import { changePassword, forgetDraftPassword, hasPassword, saveDraftPassword, setPasswordFromDraft } from "./passwords";
import { SIGN_IN, SIGN_IN_ERROR } from "./rules";

// Passwords for everyone (founder, 19 Nov 2026, A195) against a real PostgreSQL (TEST_DATABASE_URL): Join keeps only
// the password's hash on its draft; it reaches the account only through the draft of the browser that chose it, after
// the link proved the email (never through a draft named only by the link: pre-hijacking). The public sign-up stays
// off, and Change password counts wrong current passwords.
const url = process.env.TEST_DATABASE_URL;
const PASSWORD = "first-password-0123";

describe.skipIf(!url)("password accounts", () => {
  let h: DbHandle;
  let auth: ReturnType<typeof createAuth>;
  let ip = 0;
  const headers = () =>
    new Headers({ "x-forwarded-for": `10.8.${String(Math.floor(ip / 250))}.${String(ip++ % 250)}` });
  const email = (label: string) => `${label}.${uuidv7()}@example.com`;
  const signIn = (who: string, password = PASSWORD) =>
    auth.api.signInEmail({ body: { email: who, password }, headers: headers() });
  /** The account the confirm link makes (or signs in to): email confirmed, no password. */
  const linkAccount = async (who: string) => {
    const id = uuidv7();
    await h.db.insert(schema.users).values({ id, email: who, name: "", emailVerified: true });
    return { id, email: who };
  };
  /** A browser's Join draft for this email with this password. */
  const draftWith = async (who: string, password: string) => {
    const token = await startDraft();
    await updateDraft(token, { path: "member", email: who, fullName: "Asha Iyer", jobRole: "Engineering" });
    await saveDraftPassword(h.db, token, password);
    return token;
  };

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
  afterAll(async () => {
    await h.pool.end();
  });

  it("sets the Join password when the link is opened in the browser that chose it", async () => {
    const who = email("same");
    const browserA = await draftWith(who, PASSWORD);
    // Only the hash is kept, never the password.
    const [row] = await h.db.select().from(schema.joinDrafts).where(eq(schema.joinDrafts.email, who));
    expect(row?.passwordHash).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(PASSWORD);
    // Nothing can sign in before the link is opened: there is no account yet.
    await expect(signIn(who)).rejects.toMatchObject({ body: { code: SIGN_IN_ERROR.wrongPassword } });

    const user = await linkAccount(who);
    expect(await setPasswordFromDraft(h.db, browserA, user)).toBe("set");
    expect(await hasPassword(h.db, user.id)).toBe(true);
    expect((await signIn(who)).token).toBeTruthy();
    // The hash is used once.
    expect(await setPasswordFromDraft(h.db, browserA, user)).toBe("none");
  });

  it("never gives the account a password chosen in another browser (pre-hijacking)", async () => {
    const victim = email("victim");
    // Someone else fills in Join with the victim's email and their own password, in browser A.
    const attackerDraft = await draftWith(victim, "attacker-password-1");
    // The victim opens the link (its ?d= names browser A's draft) in their own browser B, which has no Join cookie.
    const user = await linkAccount(victim);
    expect(await setPasswordFromDraft(h.db, undefined, user)).toBe("none");
    // Browser B takes the draft over from the link: its password is dropped first, so a later Continue can't use it.
    await forgetDraftPassword(h.db, attackerDraft);
    expect(await setPasswordFromDraft(h.db, attackerDraft, user)).toBe("none");
    expect(await hasPassword(h.db, user.id)).toBe(false);
    await expect(signIn(victim, "attacker-password-1")).rejects.toMatchObject({
      body: { code: SIGN_IN_ERROR.wrongPassword },
    });
  });

  it("uses a draft only for its own email, and never replaces an existing password", async () => {
    const owner = email("owner");
    const other = await linkAccount(email("other"));
    const draft = await draftWith(owner, "draft-password-12");
    expect(await setPasswordFromDraft(h.db, draft, other)).toBe("none");
    expect(await hasPassword(h.db, other.id)).toBe(false);

    const user = await linkAccount(owner);
    await h.db.insert(schema.accounts).values({
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await hashPassword(PASSWORD),
    });
    expect(await setPasswordFromDraft(h.db, draft, user)).toBe("has-password");
    expect((await signIn(owner)).token).toBeTruthy();
    await expect(signIn(owner, "draft-password-12")).rejects.toMatchObject({
      body: { code: SIGN_IN_ERROR.wrongPassword },
    });
  });

  it("refuses a short password and keeps Better Auth's public sign-up off", async () => {
    const token = await startDraft();
    await expect(saveDraftPassword(h.db, token, "short")).rejects.toThrow(
      `Use at least ${String(SIGN_IN.passwordMinLength)} characters`,
    );
    await expect(
      auth.api.signUpEmail({
        body: { email: email("public"), password: PASSWORD, name: "Public" },
        headers: headers(),
      }),
    ).rejects.toBeDefined();
  });

  it("changes the password with the current one, and pauses after 5 wrong current passwords", async () => {
    const who = email("change");
    expect(await setPasswordFromDraft(h.db, await draftWith(who, PASSWORD), await linkAccount(who))).toBe("set");
    /** A session cookie from a fresh password sign-in (Change password ends every other session). */
    const sessionCookie = async (password: string) => {
      const signedIn = await auth.api.signInEmail({
        body: { email: who, password },
        headers: headers(),
        returnHeaders: true,
      });
      const set = signedIn.headers.getSetCookie().find((c) => c.includes("session_token="));
      return (set ?? "").split(";")[0] ?? "";
    };
    let cookie = await sessionCookie(PASSWORD);
    const [user] = await h.db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, who));
    const userId = user?.id ?? "";
    const session = () => new Headers({ cookie, "x-forwarded-for": "10.7.7.7" });

    expect(await changePassword(h.db, auth, session(), { userId, current: PASSWORD, next: "short" })).toMatchObject({
      ok: false,
      code: "INVALID_NEW",
    });
    expect(
      await changePassword(h.db, auth, session(), { userId, current: "wrong-current-1", next: "new-password-123" }),
    ).toEqual({ ok: false, code: "WRONG_PASSWORD", triesLeft: SIGN_IN.wrongCurrentPasswordsBeforePause - 1 });
    expect(
      await changePassword(h.db, auth, session(), { userId, current: PASSWORD, next: "new-password-123" }),
    ).toEqual({
      ok: true,
    });
    expect((await signIn(who, "new-password-123")).token).toBeTruthy();
    await expect(signIn(who)).rejects.toMatchObject({ body: { code: SIGN_IN_ERROR.wrongPassword } });

    cookie = await sessionCookie("new-password-123");
    for (let i = 1; i < SIGN_IN.wrongCurrentPasswordsBeforePause; i++) {
      await changePassword(h.db, auth, session(), {
        userId,
        current: `wrong-${String(i)}`,
        next: "another-password-1",
      });
    }
    const last = await changePassword(h.db, auth, session(), {
      userId,
      current: "wrong-5",
      next: "another-password-1",
    });
    expect(last).toMatchObject({ ok: false, code: "PAUSED" });
  });
});
