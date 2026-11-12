import { schema } from "@h2india/db";
import { randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { clearThrottle, hitThrottle, readThrottle, startThrottle } from "../sign-in/throttle";
import { deliverSms } from "../notify/channels";
import { hashToken, markMobileVerified } from "./drafts";
import { JOIN, normaliseMobile } from "./rules";

// The mobile code in Join step 3 (525:207, errors 526:384). Same rules as sign-in codes (decision A2): 6 digits,
// 10 minutes, 5 tries, resend after 30 seconds, 5 codes an hour per number.

const { verifications: v } = schema;

export class MobileCodeError extends Error {
  constructor(
    readonly code: "INVALID_MOBILE" | "RESEND_TOO_SOON" | "TOO_MANY_CODES" | "WRONG_CODE" | "EXPIRED_CODE" | "PAUSED",
    message: string,
    readonly retryAt?: Date,
    readonly triesLeft?: number,
  ) {
    super(message);
  }
}

const id = (draft: string, mobile: string) => `join-mobile:${hashToken(draft)}:${mobile}`;
const digitsOf = (mobile: string) => mobile.replace(/\D/g, "");

export async function sendMobileCode(input: { draftToken: string; mobile: string }): Promise<{ mobile: string }> {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw new MobileCodeError("INVALID_MOBILE", "Enter a 10-digit mobile number");
  const db = getDb();
  const key = digitsOf(mobile);
  const paused = await readThrottle(db, `mobile:paused:${key}`);
  if (paused) throw new MobileCodeError("PAUSED", "Too many wrong codes", paused.expiresAt);
  const gap = await hitThrottle(db, `mobile:gap:${key}`, JOIN.mobileResendSeconds);
  if (gap.count > 1) throw new MobileCodeError("RESEND_TOO_SOON", "Wait before asking again", gap.expiresAt);
  const sends = await hitThrottle(db, `mobile:sends:${key}`, 60 * 60);
  if (sends.count > JOIN.mobileCodesPerHour) {
    throw new MobileCodeError("TOO_MANY_CODES", "Too many codes for this number", sends.expiresAt);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const identifier = id(input.draftToken, mobile);
  await db.delete(v).where(eq(v.identifier, identifier));
  await db.insert(v).values({
    identifier,
    value: `${hashToken(code)}:0`,
    expiresAt: sql`now() + make_interval(mins => ${JOIN.mobileCodeMinutes})`,
  });
  await deliverSms({ template: "sms.otp_sign_in", event: "join.mobile_code", to: mobile, data: { code } });
  return { mobile };
}

export async function verifyMobileCode(input: { draftToken: string; mobile: string; code: string }): Promise<void> {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw new MobileCodeError("INVALID_MOBILE", "Enter a 10-digit mobile number");
  const db = getDb();
  const key = digitsOf(mobile);
  const paused = await readThrottle(db, `mobile:paused:${key}`);
  if (paused) throw new MobileCodeError("PAUSED", "Too many wrong codes", paused.expiresAt);
  const identifier = id(input.draftToken, mobile);
  const [row] = await db.select().from(v).where(eq(v.identifier, identifier));
  if (!row) throw new MobileCodeError("WRONG_CODE", "That code didn't work", undefined, 0);
  if (row.expiresAt < new Date()) throw new MobileCodeError("EXPIRED_CODE", "That code has expired");
  const [stored = "", tries = "0"] = row.value.split(":");
  const given = Buffer.from(hashToken(input.code.replace(/\D/g, "")));
  const ok = given.length === stored.length && timingSafeEqual(given, Buffer.from(stored));
  if (!ok) {
    const used = Number(tries) + 1;
    await db
      .update(v)
      .set({ value: `${stored}:${String(used)}` })
      .where(eq(v.id, row.id));
    const wrong = await hitThrottle(db, `mobile:wrong:${key}`, 15 * 60);
    if (used >= JOIN.mobileWrongTries || wrong.count >= JOIN.mobileWrongTries) {
      await db.delete(v).where(eq(v.id, row.id));
      const pause = await startThrottle(db, `mobile:paused:${key}`, 15 * 60);
      await clearThrottle(db, `mobile:wrong:${key}`);
      throw new MobileCodeError("PAUSED", "Too many wrong codes", pause.expiresAt);
    }
    throw new MobileCodeError("WRONG_CODE", "That code didn't work", undefined, JOIN.mobileWrongTries - used);
  }
  await db.transaction(async (tx) => {
    await tx.delete(v).where(and(eq(v.id, row.id)));
    await markMobileVerified(tx, input.draftToken, mobile);
  });
  await clearThrottle(db, `mobile:wrong:${key}`);
}
