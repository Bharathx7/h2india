"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import {
  decideRecovery,
  readRecovery,
  RecoveryCodeError,
  RecoveryError,
  requestNewEmail,
  sendNewMobileCode,
  startRecovery,
  submitLostEmail,
  submitMobileChange,
  verifyFactor,
  type Factor,
  type RecoveryKind,
} from "@h2india/core/recovery";
import { cookies, headers } from "next/headers";
import { auth, getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Server side of account recovery (step 3.5). The recovery token lives in an http-only cookie for this browser.

const COOKIE = "h2_recovery";

export type Outcome<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { value: T }))
  | { ok: false; code: string; retryAt?: string; triesLeft?: number };

function failure(error: unknown): Extract<Outcome, { ok: false }> {
  if (error instanceof RecoveryCodeError) {
    return { ok: false, code: error.code, retryAt: error.retryAt?.toISOString(), triesLeft: error.triesLeft };
  }
  if (error instanceof RecoveryError) return { ok: false, code: error.code };
  throw error;
}

async function token(): Promise<string> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) throw new RecoveryError("EXPIRED", "Start again");
  return value;
}

export async function begin(
  kind: RecoveryKind,
  email: string,
): Promise<Outcome<{ email: string; maskedMobile: string | null }>> {
  try {
    const started = await startRecovery({ kind, email });
    (await cookies()).set(COOKIE, started.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_URL?.startsWith("https://") ?? false,
      path: "/",
      maxAge: 24 * 60 * 60,
    });
    return { ok: true, value: { email: started.email, maskedMobile: started.maskedMobile } };
  } catch (error) {
    return failure(error);
  }
}

export async function verify(factor: Factor, code: string): Promise<Outcome> {
  try {
    await verifyFactor({ token: await token(), factor, code });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function newMobile(mobile: string): Promise<Outcome<string>> {
  try {
    return { ok: true, value: await sendNewMobileCode({ token: await token(), mobile }) };
  } catch (error) {
    return failure(error);
  }
}

/** Lost passkey and lost email: both proofs given, so sign the person in once (recovery plugin). */
export async function signInWithRecovery(): Promise<Outcome> {
  try {
    await auth.api.recoverySession({ body: { token: await token() }, headers: await headers() });
    return { ok: true };
  } catch (error) {
    const body = (error as { body?: { code?: string } }).body;
    if (body?.code) return { ok: false, code: body.code };
    return failure(error);
  }
}

export async function finishMobileChange(): Promise<Outcome<string>> {
  try {
    return { ok: true, value: await submitMobileChange(await token()) };
  } catch (error) {
    return failure(error);
  }
}

export async function askAdminForEmail(): Promise<Outcome<string>> {
  try {
    return { ok: true, value: await submitLostEmail(await token()) };
  } catch (error) {
    return failure(error);
  }
}

/** The waiting screens check whether the Admin has answered. */
export async function recoveryStatus(): Promise<string | null> {
  return (await readRecovery((await cookies()).get(COOKIE)?.value))?.status ?? null;
}

export async function addNewEmail(email: string): Promise<Outcome> {
  const session = await getSession();
  if (!session) return { ok: false, code: "NOT_SIGNED_IN" };
  try {
    await requestNewEmail({ userId: session.user.id, email });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** The approval page (not drawn; A11): an Admin of the company, or support. */
export async function decide(requestId: string, approve: boolean): Promise<Outcome> {
  const session = await getSession();
  if (!session) return { ok: false, code: "NOT_SIGNED_IN" };
  try {
    await decideRecovery({
      actor: await loadActor(getDb(), session.user.id),
      requestId,
      approve,
      context: await requestContext(),
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
