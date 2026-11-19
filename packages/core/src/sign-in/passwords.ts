import { schema, type Executor } from "@h2india/db";
import { hashPassword } from "better-auth/crypto";
import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { hashToken } from "../companies/drafts";
import type { Auth } from "./auth";
import { newPasswordProblem, normaliseEmail, SIGN_IN } from "./rules";
import { clearThrottle, hitThrottle, readThrottle, startThrottle } from "./throttle";

// Passwords for buyers, suppliers and members (founder, 19 Nov 2026, A195). Better Auth checks them; these are the
// steps it doesn't offer the way we need:
//  • Join keeps only the password's hash, on that browser's draft (never an account or a password login before the
//    email is proved). The hash becomes the account's password only when the confirm link is opened in the same
//    browser (the draft's cookie), for the same email, on an account with no password yet. The link alone proves the
//    inbox, not who chose the password, so a draft named only by the link's ?d= never sets one (pre-hijacking:
//    someone else's Join with your email must never give your account their password);
//  • Change password counts wrong current passwords per account and pauses like wrong sign-ins;
//  • a person with no password yet (invited, confirmed in another browser, or joined with a code before A195) can
//    choose one while signed in.

export class PasswordRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordRuleError";
  }
}

/** Join: keeps the hash of the chosen password on the draft (never the password itself). */
export async function saveDraftPassword(ex: Executor, draftToken: string, password: string): Promise<void> {
  const problem = newPasswordProblem(password);
  if (problem) throw new PasswordRuleError(problem);
  const hash = await hashPassword(password);
  await ex
    .update(schema.joinDrafts)
    .set({ passwordHash: hash })
    .where(eq(schema.joinDrafts.tokenHash, hashToken(draftToken)));
}

/**
 * Drops the password hash from a draft taken over from a confirm link's ?d= (another browser). Called before the
 * draft's token becomes this browser's Join cookie, so a password chosen by whoever filled in that draft can never
 * reach the account later through setPasswordFromDraft.
 */
export async function forgetDraftPassword(ex: Executor, draftToken: string): Promise<void> {
  await ex
    .update(schema.joinDrafts)
    .set({ passwordHash: null })
    .where(eq(schema.joinDrafts.tokenHash, hashToken(draftToken)));
}

/**
 * After the confirm link signed the person in: gives the account the password chosen at Join, from the draft held by
 * THIS browser's Join cookie (`cookieDraftToken`; never a token taken from the link). Only when the draft names the
 * signed-in email and the account has no password yet. The hash is cleared from the draft either way.
 *  • "set": the account now has the Join password;
 *  • "has-password": it already had one, which is kept;
 *  • "none": no usable draft password (another browser, another email, or none chosen).
 */
export async function setPasswordFromDraft(
  ex: Executor,
  cookieDraftToken: string | undefined,
  user: { id: string; email: string },
): Promise<"set" | "has-password" | "none"> {
  if (!cookieDraftToken) return "none";
  const d = schema.joinDrafts;
  const a = schema.accounts;
  return ex.transaction(async (tx) => {
    const [draft] = await tx
      .select({ email: d.email, passwordHash: d.passwordHash })
      .from(d)
      .where(and(eq(d.tokenHash, hashToken(cookieDraftToken)), gt(d.expiresAt, sql`now()`)))
      .for("update");
    if (!draft?.passwordHash || !draft.email) return "none";
    if (normaliseEmail(draft.email) !== normaliseEmail(user.email)) return "none";
    await tx
      .update(d)
      .set({ passwordHash: null })
      .where(eq(d.tokenHash, hashToken(cookieDraftToken)));
    const [login] = await tx
      .select({ id: a.id, password: a.password })
      .from(a)
      .where(and(eq(a.userId, user.id), eq(a.providerId, "credential")))
      .for("update");
    if (login?.password) return "has-password";
    if (login)
      await tx.update(a).set({ password: draft.passwordHash, updatedAt: new Date() }).where(eq(a.id, login.id));
    else {
      await tx
        .insert(a)
        .values({ accountId: user.id, providerId: "credential", userId: user.id, password: draft.passwordHash });
    }
    return "set";
  });
}

/** Whether this account can sign in with a password. */
export async function hasPassword(ex: Executor, userId: string): Promise<boolean> {
  const a = schema.accounts;
  const [row] = await ex
    .select({ id: a.id })
    .from(a)
    .where(and(eq(a.userId, userId), eq(a.providerId, "credential"), isNotNull(a.password)))
    .limit(1);
  return Boolean(row);
}

export type PasswordChange =
  | { ok: true }
  | { ok: false; code: "INVALID_NEW"; message: string }
  | { ok: false; code: "WRONG_PASSWORD"; triesLeft: number }
  | { ok: false; code: "PAUSED"; until: Date }
  | { ok: false; code: "NO_PASSWORD" | "FAILED" };

const changeKey = {
  wrong: (userId: string) => `password:change-wrong:${userId}`,
  paused: (userId: string) => `password:change-paused:${userId}`,
};

function codeOf(error: unknown): string | undefined {
  return (error as { body?: { code?: string } } | null)?.body?.code;
}

/**
 * Change password (A195): the current password, then the new one. Signs the person out everywhere else (Better Auth's
 * revokeOtherSessions; this device gets a fresh session). Five wrong current passwords pause it for 15 minutes.
 * `headers` are the request's, so Better Auth finds the session.
 */
export async function changePassword(
  ex: Executor,
  auth: Auth,
  headers: Headers,
  input: { userId: string; current: string; next: string },
): Promise<PasswordChange> {
  const problem = newPasswordProblem(input.next);
  if (problem) return { ok: false, code: "INVALID_NEW", message: problem };
  const pause = await readThrottle(ex, changeKey.paused(input.userId));
  if (pause) return { ok: false, code: "PAUSED", until: pause.expiresAt };
  try {
    await auth.api.changePassword({
      body: { currentPassword: input.current, newPassword: input.next, revokeOtherSessions: true },
      headers,
    });
  } catch (error) {
    const code = codeOf(error);
    if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") return { ok: false, code: "NO_PASSWORD" };
    if (code !== "INVALID_PASSWORD") return { ok: false, code: "FAILED" };
    const wrong = await hitThrottle(ex, changeKey.wrong(input.userId), SIGN_IN.pauseMinutes * 60);
    if (wrong.count >= SIGN_IN.wrongCurrentPasswordsBeforePause) {
      const paused = await startThrottle(ex, changeKey.paused(input.userId), SIGN_IN.pauseMinutes * 60);
      await clearThrottle(ex, changeKey.wrong(input.userId));
      return { ok: false, code: "PAUSED", until: paused.expiresAt };
    }
    return { ok: false, code: "WRONG_PASSWORD", triesLeft: SIGN_IN.wrongCurrentPasswordsBeforePause - wrong.count };
  }
  await clearThrottle(ex, changeKey.wrong(input.userId));
  return { ok: true };
}

/**
 * A signed-in person without a password chooses one (after accepting an invitation, A195). Better Auth's setPassword
 * only works while the account has none, and only from the server.
 */
export async function setFirstPassword(
  ex: Executor,
  auth: Auth,
  headers: Headers,
  input: { userId: string; password: string },
): Promise<{ ok: true } | { ok: false; code: "INVALID_NEW"; message: string } | { ok: false; code: "HAS_PASSWORD" }> {
  const problem = newPasswordProblem(input.password);
  if (problem) return { ok: false, code: "INVALID_NEW", message: problem };
  if (await hasPassword(ex, input.userId)) return { ok: false, code: "HAS_PASSWORD" };
  await auth.api.setPassword({ body: { newPassword: input.password }, headers });
  return { ok: true };
}
