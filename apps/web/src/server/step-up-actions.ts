"use server";

import { getDb } from "@h2india/core";
import { RecoveryCodeError } from "@h2india/core/recovery";
import { confirmStepUpCode, sendStepUpCode } from "@h2india/core/sign-in/step-up";
import { getSession } from "@/server/auth";

// Confirm it's you (17 Nov 2026, A183; passkeys removed): a code to the signed-in person's own email before a bank
// change or an order approval. The code goes only to the session's email; the browser never names an address.

type Outcome = { ok: true } | { ok: false; error: string };

function problem(error: unknown): Outcome {
  if (error instanceof RecoveryCodeError) {
    const messages: Record<RecoveryCodeError["code"], string> = {
      WRONG_CODE:
        error.triesLeft === undefined
          ? "That code didn't work. Check it and try again."
          : `That code didn't work. You have ${String(error.triesLeft)} ${error.triesLeft === 1 ? "try" : "tries"} left.`,
      EXPIRED_CODE: "That code has expired. Send a new one.",
      PAUSED: "Too many wrong codes. Wait 15 minutes and try again.",
      RESEND_TOO_SOON: "Wait a few seconds before asking for another code.",
      TOO_MANY_CODES: "Too many codes asked for. Try again in an hour.",
    };
    return { ok: false, error: messages[error.code] };
  }
  return { ok: false, error: "Something went wrong. Try again." };
}

export async function sendStepUpAction(): Promise<Outcome> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  try {
    await sendStepUpCode(getDb(), session.user.id);
    return { ok: true };
  } catch (error) {
    return problem(error);
  }
}

export async function confirmStepUpAction(code: string): Promise<Outcome> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code." };
  try {
    await confirmStepUpCode(getDb(), session.user.id, code.trim());
    return { ok: true };
  } catch (error) {
    return problem(error);
  }
}
