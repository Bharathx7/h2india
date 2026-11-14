import type { Executor } from "@h2india/db";
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
