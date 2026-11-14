import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { renderSignInCode } from "@h2india/emails";
import { randomInt, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { hashToken } from "../companies/drafts";
import { getDb } from "../db";
import { deliverEmail, deliverSms } from "../notify/channels";
import { clearThrottle, hitThrottle, readThrottle, startThrottle } from "../sign-in/throttle";
import { SIGN_IN } from "../sign-in/rules";
import { formatIstTime } from "../time";

// One-time codes for account recovery (step 3.5): same rules as sign-in codes (decision A2). Each code belongs to one
// recovery attempt and one factor; five wrong tries pause that email or number for 15 minutes.

const { verifications: v } = schema;

export class RecoveryCodeError extends Error {
  constructor(
    readonly code: "WRONG_CODE" | "EXPIRED_CODE" | "PAUSED" | "RESEND_TOO_SOON" | "TOO_MANY_CODES",
    message: string,
    readonly retryAt?: Date,
    readonly triesLeft?: number,
  ) {
    super(message);
  }
}

const destinationKey = (to: string) => to.replace(/\s+/g, "").toLowerCase();

export async function sendCode(input: {
  key: string;
  channel: "email" | "sms";
  to: string;
  name?: string;
  /** Another code email that follows the same rules, for example Claim this profile (step 6.7). */
  template?: "email.recovery_code" | "email.claim_code";
  event?: string;
}): Promise<void> {
  const db = getDb();
  const dest = destinationKey(input.to);
  const paused = await readThrottle(db, `recovery:paused:${dest}`);
  if (paused) throw new RecoveryCodeError("PAUSED", "Too many wrong codes", paused.expiresAt);
  const gap = await hitThrottle(db, `recovery:gap:${dest}`, SIGN_IN.resendSeconds);
  if (gap.count > 1) throw new RecoveryCodeError("RESEND_TOO_SOON", "Wait before asking again", gap.expiresAt);
  const sends = await hitThrottle(db, `recovery:sends:${dest}`, 60 * 60);
  if (sends.count > SIGN_IN.codesPerEmailPerHour) {
    throw new RecoveryCodeError("TOO_MANY_CODES", "Too many codes", sends.expiresAt);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.delete(v).where(eq(v.identifier, input.key));
  await db.insert(v).values({
    identifier: input.key,
    value: `${hashToken(code)}:0`,
    expiresAt: sql`now() + make_interval(mins => ${SIGN_IN.codeMinutes})`,
  });
  if (input.channel === "sms") {
    await deliverSms({ template: "sms.otp_sign_in", event: "account.recovery_code", to: input.to, data: { code } });
    return;
  }
  const env = parseServerEnv();
  const mail = await renderSignInCode({
    appUrl: env.APP_URL,
    code,
    name: input.name,
    purpose: "verification",
    expiresIn: `${String(SIGN_IN.codeMinutes)} minutes`,
    expiresAt: `${formatIstTime(new Date(Date.now() + SIGN_IN.codeMinutes * 60_000))} IST`,
  });
  await deliverEmail({
    template: input.template ?? "email.recovery_code",
    event: input.event ?? "account.recovery_code",
    to: input.to,
    mail,
    security: true,
  });
}

export async function checkCode(input: { key: string; to: string; code: string }): Promise<void> {
  const db = getDb();
  const dest = destinationKey(input.to);
  const paused = await readThrottle(db, `recovery:paused:${dest}`);
  if (paused) throw new RecoveryCodeError("PAUSED", "Too many wrong codes", paused.expiresAt);
  const [row] = await db.select().from(v).where(eq(v.identifier, input.key));
  if (!row) throw new RecoveryCodeError("WRONG_CODE", "That code didn't work", undefined, 0);
  if (row.expiresAt < new Date()) throw new RecoveryCodeError("EXPIRED_CODE", "That code has expired");
  const [stored = "", tries = "0"] = row.value.split(":");
  const given = Buffer.from(hashToken(input.code.replace(/\D/g, "")));
  if (given.length === stored.length && timingSafeEqual(given, Buffer.from(stored))) {
    await db.delete(v).where(eq(v.id, row.id));
    await clearThrottle(db, `recovery:wrong:${dest}`);
    return;
  }
  const used = Number(tries) + 1;
  await db
    .update(v)
    .set({ value: `${stored}:${String(used)}` })
    .where(eq(v.id, row.id));
  const wrong = await hitThrottle(db, `recovery:wrong:${dest}`, SIGN_IN.pauseMinutes * 60);
  if (used >= SIGN_IN.wrongCodesBeforePause || wrong.count >= SIGN_IN.wrongCodesBeforePause) {
    await db.delete(v).where(eq(v.id, row.id));
    const pause = await startThrottle(db, `recovery:paused:${dest}`, SIGN_IN.pauseMinutes * 60);
    await clearThrottle(db, `recovery:wrong:${dest}`);
    throw new RecoveryCodeError("PAUSED", "Too many wrong codes", pause.expiresAt);
  }
  throw new RecoveryCodeError("WRONG_CODE", "That code didn't work", undefined, SIGN_IN.wrongCodesBeforePause - used);
}
