import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { getDb } from "../db";
import { normaliseEmail, SIGN_IN, SIGN_IN_ERROR } from "./rules";
import { recordPasskeyStepUp } from "./step-up";
import { clearThrottle, hitThrottle, readThrottle, startThrottle } from "./throttle";

// The sign-in rules Better Auth does not have (ADR 0003, decision A2), run around its email-code routes:
//  • a 15-minute pause for an email after 5 wrong codes, even with a new code (Figma 524:2036)
//  • at most 5 codes an hour per email, and one every 30 seconds ("Resend code in 0:24", Figma 524:1840)
//  • the number of tries left, for the wrong-code message (Figma 524:1930)

const SEND = "/email-otp/send-verification-otp";
const VERIFY = "/sign-in/email-otp";
/** The Verify email link of the Join flow: one a minute, 5 an hour per email. */
const LINK = "/sign-in/magic-link";
const LINK_GAP_SECONDS = 60;

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
  if (ctx.path === LINK) {
    await limitLinks(emailOf(ctx));
    return;
  }
  if (ctx.path !== SEND && ctx.path !== VERIFY) return;
  const email = emailOf(ctx);
  if (!email) return;
  const db = getDb();
  const pause = await readThrottle(db, key.paused(email));
  if (pause) throw pausedError(pause.expiresAt);
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

/** A passkey sign-in that succeeded (step 8.6 step-up). */
const PASSKEY = "/passkey/verify-authentication";

export const afterSignIn = createAuthMiddleware(async (ctx) => {
  if (ctx.path === PASSKEY) {
    const userId = ctx.context.newSession?.user.id;
    if (userId && !isAPIError(ctx.context.returned)) await recordPasskeyStepUp(getDb(), userId);
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
