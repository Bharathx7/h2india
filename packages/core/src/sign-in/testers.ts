import { isEnabled } from "@h2india/config";
import type { Executor } from "@h2india/db";
import { z } from "zod";
import { defineSetting, getSetting } from "../settings";
import { normaliseEmail } from "./rules";

// Test accounts (founder, 18 Nov 2026): a few shared buyer, supplier and member accounts that testers in other places
// sign in to with a password, because sign-in codes are caught on the server until the email provider is chosen (M6).
// Only the emails on this list, and only while the testerSignIn switch is on (System settings or FLAG_TESTER_SIGN_IN).
// A tester session is never a staff session, so testers never reach the back office. The list is written only by
// `pnpm testers:create` (packages/core/scripts/create-testers.ts), which also sets the shared password.

export const TESTER_ACCOUNTS = defineSetting<string[]>({
  key: "sign-in.testers",
  description: "Emails of the shared test accounts that may sign in with a password while testerSignIn is on.",
  schema: z.array(z.email()).max(10),
  fallback: [],
});

/** Whether this email may use the password sign-in as a tester right now. */
export async function isTesterEmail(ex: Executor, email: string): Promise<boolean> {
  if (!isEnabled("testerSignIn")) return false;
  const list = await getSetting(ex, TESTER_ACCOUNTS);
  return list.map(normaliseEmail).includes(normaliseEmail(email));
}
