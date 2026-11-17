import { schema, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { checkCode, sendCode } from "../recovery/codes";
import { SIGN_IN } from "./rules";
import { readThrottle, startThrottle } from "./throttle";

// Confirm it's you (step 8.6, changed 17 Nov 2026 when passkeys were removed): a sensitive change, such as the payout
// bank account or an order approval, needs a code sent to the person's email and entered in the last few minutes.
// The code follows the sign-in rules (A2) through the recovery code store; the confirmation lives in the throttle
// store, so it simply expires.

const stepKey = (userId: string) => `step-up:${userId}`;
const codeKey = (userId: string) => `step-up-code:${userId}`;

export async function recordStepUp(ex: Executor, userId: string) {
  await startThrottle(ex, stepKey(userId), SIGN_IN.stepUpMinutes * 60);
}

/** Whether the person entered a confirmation code in the last few minutes. */
export async function stepUpConfirmedRecently(ex: Executor, userId: string): Promise<boolean> {
  return Boolean(await readThrottle(ex, stepKey(userId)));
}

/** Sends a confirmation code to the person's own email (never an address from the browser). */
export async function sendStepUpCode(ex: Executor, userId: string): Promise<void> {
  const [user] = await ex
    .select({ email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user) throw new Error("No such person");
  await sendCode({
    key: codeKey(userId),
    channel: "email",
    to: user.email,
    name: user.name.trim().split(/\s+/)[0] || undefined,
    template: "email.step_up_code",
    event: "account.step_up_code",
    purpose: "confirm",
  });
}

/** Checks the code; once right, the person counts as confirmed for SIGN_IN.stepUpMinutes. */
export async function confirmStepUpCode(ex: Executor, userId: string, code: string): Promise<void> {
  const [user] = await ex.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new Error("No such person");
  await checkCode({ key: codeKey(userId), to: user.email, code });
  await recordStepUp(ex, userId);
}

// Staff sessions (step 12.1, review H2; changed 17 Nov 2026): a session made by the back-office password sign-in is
// marked for its whole life, so the back office can refuse sessions made with an email code or Google alone.
const sessionKey = (sessionId: string) => `staff-session:${sessionId}`;

export async function recordStaffSession(ex: Executor, sessionId: string, seconds: number) {
  await startThrottle(ex, sessionKey(sessionId), seconds);
}

export async function isStaffSession(ex: Executor, sessionId: string): Promise<boolean> {
  return Boolean(await readThrottle(ex, sessionKey(sessionId)));
}
