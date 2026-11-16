"use server";

import {
  applyDraft,
  cancelJoinRequest,
  CompanyError,
  createCompany,
  discardDraft,
  JOB_ROLES,
  joinProfile,
  JoinRequestError,
  membershipsOf,
  MobileCodeError,
  notifyAdminsOfRequest,
  readDraft,
  remindJoinRequest,
  requestToJoin,
  searchCompanies,
  sendMobileCode,
  setProfileType,
  updateDraft,
  verifyMobileCode,
  type CompanyMatch,
  type JoinPath,
} from "@h2india/core/companies";
import { getDb } from "@h2india/core";
import { normaliseEmail } from "@h2india/core/sign-in";
import { headers } from "next/headers";
import { auth, getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { clearDraftCookie, draftToken, ensureDraft, workspaceFor } from "@/server/join";

import { currentTermsVersion } from "@/trust/terms";

// Server side of the Join flow (step 3.3). Every rule lives in packages/core; these only connect the screens to it.

export type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { value: T }))
  | { ok: false; code: string; message?: string; retryAt?: string; triesLeft?: number; organisationId?: string };

const fail = (code: string, extra: Partial<Extract<Result, { ok: false }>> = {}): Extract<Result, { ok: false }> => ({
  ok: false,
  code,
  ...extra,
});

export async function choosePath(path: JoinPath): Promise<Result> {
  const token = await ensureDraft();
  await updateDraft(token, { path, organisationId: null });
  return { ok: true };
}

export async function findCompanies(query: string): Promise<Result<CompanyMatch[]>> {
  return { ok: true, value: await searchCompanies(getDb(), query) };
}

/** Step 2: the company the person asks to join, or null to create a new one. */
export async function pickCompany(organisationId: string | null): Promise<Result> {
  const token = await ensureDraft();
  await updateDraft(token, { organisationId });
  return { ok: true };
}

export async function sendCode(mobile: string): Promise<Result<string>> {
  try {
    const { mobile: m } = await sendMobileCode({ draftToken: await ensureDraft(), mobile });
    return { ok: true, value: m };
  } catch (error) {
    if (error instanceof MobileCodeError) return fail(error.code, { retryAt: error.retryAt?.toISOString() });
    console.error("join: sending the mobile code failed", error);
    return fail("SEND_FAILED");
  }
}

export async function checkCode(mobile: string, code: string): Promise<Result> {
  try {
    await verifyMobileCode({ draftToken: await ensureDraft(), mobile, code });
    return { ok: true };
  } catch (error) {
    if (error instanceof MobileCodeError) {
      return fail(error.code, { retryAt: error.retryAt?.toISOString(), triesLeft: error.triesLeft });
    }
    throw error;
  }
}

export interface Details {
  email?: string;
  fullName: string;
  jobRole: string;
  terms: boolean;
}

/** After the person's email is confirmed: copy the draft to the account and decide where they go next. */
async function nextAfterDetails(token: string, user: { id: string; email: string }): Promise<Result<string>> {
  const draft = await applyDraft(token, user);
  if (!draft?.path) return fail("INCOMPLETE");
  if (draft.path === "member") {
    await discardDraft(token);
    await clearDraftCookie();
    return { ok: true, value: "/join/done" };
  }
  if (draft.organisationId) {
    try {
      const request = await requestToJoin({
        userId: user.id,
        organisationId: draft.organisationId,
        context: await requestContext(),
      });
      if (request.created)
        await notifyAdminsOfRequest(request.id).catch((e: unknown) => {
          console.error("join: emailing the admins failed", e);
        });
    } catch (error) {
      if (error instanceof JoinRequestError && error.code === "ALREADY_MEMBER") {
        return { ok: true, value: workspaceFor(draft.path) };
      }
      throw error;
    }
    await discardDraft(token);
    await clearDraftCookie();
    return { ok: true, value: "/join/request" };
  }
  // Company details on that account's own sign-up page (public QC 3), not the shared /join.
  return { ok: true, value: `/join/${draft.path}?step=company` };
}

/** Step 3. Signed-in people go straight on; others get the Verify email link (decision A7). */
export async function submitDetails(details: Details): Promise<Result<string>> {
  const token = await ensureDraft();
  const draft = await readDraft(token);
  if (!draft?.path) return fail("NO_PATH");
  if (!draft.mobileVerified) return fail("MOBILE_NOT_VERIFIED");
  const fullName = details.fullName.trim();
  if (fullName.length < 2) return fail("NAME_REQUIRED");
  if (!(JOB_ROLES as readonly string[]).includes(details.jobRole)) return fail("ROLE_REQUIRED");
  if (!details.terms) return fail("TERMS_REQUIRED");

  const session = await getSession();
  if (session) {
    await updateDraft(token, {
      email: session.user.email,
      fullName,
      jobRole: details.jobRole,
      termsAccepted: true,
      termsVersion: await currentTermsVersion(),
    });
    return nextAfterDetails(token, { id: session.user.id, email: session.user.email });
  }

  const email = normaliseEmail(details.email ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("EMAIL_REQUIRED");
  await updateDraft(token, {
    email,
    fullName,
    jobRole: details.jobRole,
    termsAccepted: true,
    termsVersion: await currentTermsVersion(),
  });
  return sendLink(email);
}

async function sendLink(email: string): Promise<Result<string>> {
  try {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/join/confirmed", errorCallbackURL: "/join/verify?expired=1" },
      headers: await headers(),
    });
    return { ok: true, value: "/join/verify" };
  } catch (error) {
    const body = (error as { body?: { code?: string; retryAt?: string } }).body;
    if (body?.code) return fail(body.code, { retryAt: body.retryAt });
    throw error;
  }
}

/** "Resend email" and "Send a new link" on the Verify email screens. */
export async function resendLink(): Promise<Result<string>> {
  const draft = await readDraft(await draftToken());
  if (!draft?.email) return fail("NO_EMAIL");
  return sendLink(draft.email);
}

/** "Continue" on Email confirmed. */
export async function continueAfterConfirm(): Promise<Result<string>> {
  const session = await getSession();
  const token = await draftToken();
  if (!session || !token) return fail("NOT_SIGNED_IN");
  return nextAfterDetails(token, { id: session.user.id, email: session.user.email });
}

export interface CompanyInput {
  gstins: string[];
  name?: string;
}

/** Step 4: create the company. Returns where to go next. */
export async function createCompanyAction(input: CompanyInput): Promise<Result<string>> {
  const session = await getSession();
  if (!session) return fail("NOT_SIGNED_IN");
  const profile = await joinProfile(session.user.id);
  if (profile?.profileType !== "buyer" && profile?.profileType !== "supplier") return fail("NO_PATH");
  try {
    await createCompany({
      userId: session.user.id,
      kind: profile.profileType,
      gstins: input.gstins,
      name: input.name,
      context: await requestContext(),
    });
    const token = await draftToken();
    if (token) await discardDraft(token);
    await clearDraftCookie();
    return { ok: true, value: "/join/done" };
  } catch (error) {
    if (error instanceof CompanyError) return fail(error.code, { organisationId: error.organisationId });
    throw error;
  }
}

/** State 5 ("already registered") and "Request to join" for a signed-in person. */
export async function requestToJoinAction(organisationId: string): Promise<Result<string>> {
  const session = await getSession();
  if (!session) return fail("NOT_SIGNED_IN");
  try {
    const request = await requestToJoin({ userId: session.user.id, organisationId, context: await requestContext() });
    if (request.created)
      await notifyAdminsOfRequest(request.id).catch((e: unknown) => {
        console.error("join: emailing the admins failed", e);
      });
    return { ok: true, value: "/join/request" };
  } catch (error) {
    if (error instanceof JoinRequestError && error.code === "ALREADY_MEMBER") {
      return { ok: true, value: workspaceFor((await membershipsOf(getDb(), session.user.id))[0]?.kind) };
    }
    throw error;
  }
}

export async function remindAction(requestId: string): Promise<Result> {
  const session = await getSession();
  if (!session) return fail("NOT_SIGNED_IN");
  try {
    await remindJoinRequest({ userId: session.user.id, requestId });
    await notifyAdminsOfRequest(requestId, { reminder: true });
    return { ok: true };
  } catch (error) {
    if (error instanceof JoinRequestError) return fail(error.code);
    throw error;
  }
}

export async function cancelAction(requestId: string): Promise<Result<string>> {
  const session = await getSession();
  if (!session) return fail("NOT_SIGNED_IN");
  try {
    await cancelJoinRequest({ userId: session.user.id, requestId, context: await requestContext() });
    const profile = await joinProfile(session.user.id);
    return { ok: true, value: profile?.profileType === "supplier" ? "/join/supplier" : "/join/buyer" };
  } catch (error) {
    if (error instanceof JoinRequestError) return fail(error.code);
    throw error;
  }
}

/** "Create a separate company" after a rejected or expired request. */
export async function startSeparateCompany(): Promise<Result<string>> {
  const session = await getSession();
  if (!session) return fail("NOT_SIGNED_IN");
  const profile = await joinProfile(session.user.id);
  const kind = profile?.profileType === "supplier" ? "supplier" : "buyer";
  if (profile?.profileType !== "buyer" && profile?.profileType !== "supplier") {
    await setProfileType(session.user.id, "buyer");
  }
  return { ok: true, value: `/join/${kind}?step=company` };
}
