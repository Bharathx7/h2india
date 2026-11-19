"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import {
  closeSupportRequest,
  decideRecovery,
  readRecovery,
  RecoveryCodeError,
  RecoveryError,
  requestNewEmail,
  startRecovery,
  submitLostEmail,
  submitSupportRequest,
  SupportRequestError,
  verifyFactor,
  type Factor,
  type RecoveryKind,
  type SupportField,
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

// "I changed my mobile number" was removed on 19 Nov 2026 (A195): its new-number steps are no longer offered here.
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

/** Lost email: both proofs given, so sign the person in once (recovery plugin). */
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

/** Lost email, "Or send a support request" (528:534). The person is signed out; the Work ID was uploaded first. */
export async function sendSupportRequest(input: {
  fullName: string;
  company: string;
  contactEmail: string;
  fileId: string;
  fileKey?: string;
}): Promise<
  | { ok: true; reference: string; company: string; contactEmail: string }
  | { ok: false; field: SupportField | null; message: string }
> {
  const session = await getSession();
  const context = await requestContext();
  try {
    const result = await submitSupportRequest({
      ...input,
      actor: await loadActor(getDb(), session?.user.id ?? null),
      ip: context.ip,
      context,
    });
    return {
      ok: true,
      reference: result.reference,
      company: input.company.trim(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
    };
  } catch (error) {
    if (error instanceof SupportRequestError) return { ok: false, field: error.field, message: error.message };
    throw error;
  }
}

/** Support marks a request handled (A23); the Work ID is deleted 30 days later (A22). */
export async function closeSupport(requestId: string): Promise<Outcome> {
  const session = await getSession();
  if (!session) return { ok: false, code: "NOT_SIGNED_IN" };
  try {
    await closeSupportRequest({
      actor: await loadActor(getDb(), session.user.id),
      requestId,
      context: await requestContext(),
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
