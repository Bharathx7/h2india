import { schema, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { readThrottle, startThrottle } from "./throttle";

// Passkey step-up (step 8.6): a passkey sign-in within the last few minutes confirms a sensitive change, such as the
// payout bank account. Recorded by the sign-in hooks; kept in the throttle store, so it simply expires.

export const STEP_UP_SECONDS = 300;
const stepKey = (userId: string) => `step-up:passkey:${userId}`;

export async function recordPasskeyStepUp(ex: Executor, userId: string) {
  await startThrottle(ex, stepKey(userId), STEP_UP_SECONDS);
}

export async function passkeyConfirmedRecently(ex: Executor, userId: string): Promise<boolean> {
  return Boolean(await readThrottle(ex, stepKey(userId)));
}

// Passkey sessions (step 12.1, review H2; A172 "every operator uses a passkey"): a session made by a passkey sign-in is
// marked for its whole life, so the back office can refuse sessions made with an email code or Google alone.
const sessionKey = (sessionId: string) => `passkey-session:${sessionId}`;

export async function recordPasskeySession(ex: Executor, sessionId: string, seconds: number) {
  await startThrottle(ex, sessionKey(sessionId), seconds);
}

export async function isPasskeySession(ex: Executor, sessionId: string): Promise<boolean> {
  return Boolean(await readThrottle(ex, sessionKey(sessionId)));
}

/** Whether the person has registered any passkey (the passkey step offers to create one if not). */
export async function hasPasskey(ex: Executor, userId: string): Promise<boolean> {
  const rows = await ex
    .select({ id: schema.passkeys.id })
    .from(schema.passkeys)
    .where(eq(schema.passkeys.userId, userId))
    .limit(1);
  return rows.length > 0;
}
