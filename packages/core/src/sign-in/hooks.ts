import { schema, type Executor } from "@h2india/db";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { hasOperatorRole } from "../authz/actor";
import { normaliseEmail, SIGN_IN, SIGN_IN_ERROR } from "./rules";
import { recordStaffSession } from "./step-up";
import { clearThrottle, hitThrottle, readThrottle, startThrottle } from "./throttle";
import { isSuspended } from "../admin/users";
import { maySignIn } from "./accounts";

// The sign-in rules Better Auth does not have (ADR 0003, decision A2), run around its email-code routes:
//  • a 15-minute pause for an email after 5 wrong codes, even with a new code (Figma 524:2036)
//  • at most 5 codes an hour per email, and one every 30 seconds ("Resend code in 0:24", Figma 524:1840)
//  • the number of tries left, for the wrong-code message (Figma 524:1930)
// and around the staff password sign-in (17 Nov 2026, A183): staff only, the same pause after 5 wrong tries, and a
// staff session mark so the back office can refuse sessions made any other way.

const SEND = "/email-otp/send-verification-otp";
const VERIFY = "/sign-in/email-otp";
/** The Verify email link of the Join flow: one a minute, 5 an hour per email. */
const LINK = "/sign-in/magic-link";
const LINK_GAP_SECONDS = 60;
/** The staff password sign-in, and asking for a "set your password" link. */
const PASSWORD = "/sign-in/email";
const PASSWORD_LINK = "/request-password-reset";

/** Whether this email belongs to someone with an operator role (H2 Economy staff). */
export async function isStaffEmail(ex: Executor, email: string): Promise<boolean> {
  const [user] = await ex
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, normaliseEmail(email)));
  return user ? hasOperatorRole(ex, user.id) : false;
}

function wrongPassword(triesLeft?: number): APIError {
  return new APIError("UNAUTHORIZED", {
    code: SIGN_IN_ERROR.wrongPassword,
    message: "Email or password is wrong",
    ...(triesLeft === undefined ? {} : { triesLeft }),
  });
}

type Ctx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

const key = {
  paused: (email: string) => `sign-in:paused:${email}`,
  wrong: (email: string) => `sign-in:wrong:${email}`,
  sends: (email: string) => `sign-in:sends:${email}`,
  gap: (email: string) => `sign-in:gap:${email}`,
};

function emailOf(ctx: Ctx): string {
  const body = ctx.body as { email?: unknown } | undefined;
  return typeof body?.email === "string" ? normaliseEmail(body.email) : "";
}

function pausedError(until: Date): APIError {
  return new APIError("TOO_MANY_REQUESTS", {
    code: SIGN_IN_ERROR.paused,
    message: `Sign-in paused for ${String(SIGN_IN.pauseMinutes)} minutes`,
    until: until.toISOString(),
  });
}

export const beforeSignIn = createAuthMiddleware(async (ctx) => {
  if (ctx.path === LINK || ctx.path === PASSWORD_LINK) {
    await limitLinks(emailOf(ctx));
    return;
  }
  if (ctx.path !== SEND && ctx.path !== VERIFY && ctx.path !== PASSWORD) return;
  const email = emailOf(ctx);
  if (!email) return;
  const db = getDb();
  // A suspended account can't sign in (653:568, step 11.4); appeals go to email until G10 is designed.
  if (await isSuspended(db, email)) {
    throw new APIError("FORBIDDEN", {
      code: SIGN_IN_ERROR.suspended,
      message:
        "This account is suspended. To appeal, reply to the email we sent you or write to the grievance officer.",
    });
  }
  const pause = await readThrottle(db, key.paused(email));
  if (pause) throw pausedError(pause.expiresAt);
  // The password sign-in is for staff only: anyone else gets the same answer as a wrong password.
  if (ctx.path === PASSWORD) {
    if (!(await isStaffEmail(db, email))) throw wrongPassword();
    return;
  }
  // Signing in never creates an account (public QC 2): without an account or an invitation, no code works.
  if (ctx.path === VERIFY && !(await maySignIn(db, email))) {
    throw new APIError("BAD_REQUEST", { code: SIGN_IN_ERROR.wrongCode, message: "That code didn't work" });
  }
  if (ctx.path !== SEND) return;

  const gap = await hitThrottle(db, key.gap(email), SIGN_IN.resendSeconds);
  if (gap.count > 1) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: SIGN_IN_ERROR.resendTooSoon,
      message: "Wait a few seconds before asking for another code",
      retryAt: gap.expiresAt.toISOString(),
    });
  }
  const sends = await hitThrottle(db, key.sends(email), 60 * 60);
  if (sends.count > SIGN_IN.codesPerEmailPerHour) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: SIGN_IN_ERROR.tooManyCodes,
      message: "Too many codes for this email",
      retryAt: sends.expiresAt.toISOString(),
    });
  }
});

async function limitLinks(email: string) {
  if (!email) return;
  const db = getDb();
  const gap = await hitThrottle(db, `join:link-gap:${email}`, LINK_GAP_SECONDS);
  if (gap.count > 1) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: SIGN_IN_ERROR.resendTooSoon,
      message: "Wait a little before asking for another link",
      retryAt: gap.expiresAt.toISOString(),
    });
  }
  const sends = await hitThrottle(db, `join:link-sends:${email}`, 60 * 60);
  if (sends.count > SIGN_IN.codesPerEmailPerHour) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: SIGN_IN_ERROR.tooManyCodes,
      message: "Too many links for this email",
      retryAt: sends.expiresAt.toISOString(),
    });
  }
}

export const afterSignIn = createAuthMiddleware(async (ctx) => {
  if (ctx.path === PASSWORD) {
    await afterPassword(ctx);
    return;
  }
  if (ctx.path !== VERIFY) return;
  const email = emailOf(ctx);
  if (!email) return;
  const db = getDb();
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) {
    await clearThrottle(db, key.wrong(email));
    return;
  }
  const code = (returned.body as { code?: string } | undefined)?.code;
  // Better Auth stops a code after its own 5 tries (TOO_MANY_ATTEMPTS); both count as wrong codes here.
  if (code !== SIGN_IN_ERROR.wrongCode && code !== "TOO_MANY_ATTEMPTS") return;
  const wrong = await hitThrottle(db, key.wrong(email), SIGN_IN.pauseMinutes * 60);
  if (wrong.count >= SIGN_IN.wrongCodesBeforePause) {
    const pause = await startThrottle(db, key.paused(email), SIGN_IN.pauseMinutes * 60);
    await clearThrottle(db, key.wrong(email));
    throw pausedError(pause.expiresAt);
  }
  throw new APIError("BAD_REQUEST", {
    code: SIGN_IN_ERROR.wrongCode,
    message: "That code didn't work",
    triesLeft: SIGN_IN.wrongCodesBeforePause - wrong.count,
  });
});

/** Staff password sign-in: mark the session, or count a wrong try (5 pause the email, like wrong codes). */
async function afterPassword(ctx: Ctx) {
  const email = emailOf(ctx);
  if (!email) return;
  const db = getDb();
  const created = ctx.context.newSession;
  if (created && !isAPIError(ctx.context.returned)) {
    await clearThrottle(db, key.wrong(email));
    await recordStaffSession(db, created.session.id, SIGN_IN.sessionDays * 24 * 60 * 60);
    return;
  }
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) return;
  const code = (returned.body as { code?: string } | undefined)?.code;
  if (code !== SIGN_IN_ERROR.wrongPassword) return;
  const wrong = await hitThrottle(db, key.wrong(email), SIGN_IN.pauseMinutes * 60);
  if (wrong.count >= SIGN_IN.wrongCodesBeforePause) {
    const pause = await startThrottle(db, key.paused(email), SIGN_IN.pauseMinutes * 60);
    await clearThrottle(db, key.wrong(email));
    throw pausedError(pause.expiresAt);
  }
  throw wrongPassword(SIGN_IN.wrongCodesBeforePause - wrong.count);
}
