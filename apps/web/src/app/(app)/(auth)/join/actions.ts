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
  notifyAdminsOfRequest,
  readDraft,
  remindJoinRequest,
  requestToJoin,
  searchCompanies,
  setProfileType,
  updateDraft,
  type CompanyMatch,
  type JoinPath,
} from "@h2india/core/companies";
import { getDb } from "@h2india/core";
import { newPasswordProblem, normaliseEmail, PASSWORD_PAGES } from "@h2india/core/sign-in";
import {
  forgetDraftPassword,
  hasPassword,
  PasswordRuleError,
  saveDraftPassword,
  setPasswordFromDraft,
} from "@h2india/core/sign-in/passwords";
import { headers } from "next/headers";
import { auth, getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { adoptDraft, clearDraftCookie, draftToken, ensureDraft, workspaceFor } from "@/server/join";

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
  // Coming back to the same sign-up page (Change email, a failed Continue) keeps the company already picked.
  const draft = await readDraft(token);
  if (draft?.path === path) return { ok: true };
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

export interface Details {
  email?: string;
  /**
   * The password chosen at Join (A195). Only its hash is kept, on this browser's draft, and it becomes the account's
   * password only when the confirm link is opened in this browser. Not asked of someone already signed in.
   */
  password?: string;
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

/**
 * Step 3. Signed-in people go straight on; others get the Verify email link (decision A7), with their password's
 * hash kept on the draft until then (A195). No account exists before the link is opened. No mobile number (A195).
 */
export async function submitDetails(details: Details): Promise<Result<string>> {
  const token = await ensureDraft();
  const draft = await readDraft(token);
  if (!draft?.path) return fail("NO_PATH");
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
  const password = details.password ?? "";
  const problem = newPasswordProblem(password);
  if (problem) return fail("INVALID_PASSWORD", { message: problem });
  await updateDraft(token, {
    email,
    fullName,
    jobRole: details.jobRole,
    termsAccepted: true,
    termsVersion: await currentTermsVersion(),
  });
  try {
    await saveDraftPassword(getDb(), token, password);
  } catch (error) {
    if (error instanceof PasswordRuleError) return fail("INVALID_PASSWORD", { message: error.message });
    throw error;
  }
  // The same link and the same "Check your inbox" whether or not the email has an account, so the page never reveals
  // one; an existing password is never replaced (setPasswordFromDraft).
  return sendLink(email, token);
}

/** Where the confirm link returns, carrying the draft (founder QC, 19 Nov 2026), so it works in any browser. */
const confirmedPath = (token: string) => `/join/confirmed?d=${encodeURIComponent(token)}`;

/**
 * The confirm link carries the draft token, so it works in any browser or on a phone, not only the one that filled
 * in the form (founder QC, 19 Nov 2026: links opened elsewhere fell back to /join). It is applied only to the
 * account whose email the draft names, which the link itself proves.
 */
async function sendLink(email: string, token: string): Promise<Result<string>> {
  try {
    await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL: confirmedPath(token),
        errorCallbackURL: "/join/verify?expired=1",
      },
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
  const token = await draftToken();
  const draft = await readDraft(token);
  if (!token || !draft?.email) return fail("NO_EMAIL");
  return sendLink(draft.email, token);
}

/**
 * "Continue" on Email confirmed. Uses the draft named by the link first, then the browser's own Join cookie. If
 * neither can be applied, someone who already finished Join goes on to where they left off; anyone else goes back
 * to their own sign-up page with their answers kept, never to the shared /join choice.
 *
 * The password (A195): set from the draft only through this browser's own Join cookie, before any draft is adopted
 * (setPasswordFromDraft). A draft taken over from the link's ?d= loses its password first. Someone who ends up with
 * no password (link opened in another browser) chooses one on Set your password before going on.
 */
export async function continueAfterConfirm(linkToken?: string): Promise<Result<string>> {
  const session = await getSession();
  if (!session) return fail("NOT_SIGNED_IN", { message: "/join/verify?expired=1" });
  const user = { id: session.user.id, email: session.user.email };
  const cookieToken = await draftToken();
  await setPasswordFromDraft(getDb(), cookieToken, user);
  const next = await nextAfterConfirm(user, cookieToken, linkToken);
  if (!next.ok || (await hasPassword(getDb(), user.id))) return next;
  return { ok: true, value: `${PASSWORD_PAGES.set}?join=1&next=${encodeURIComponent(next.value)}` };
}

async function nextAfterConfirm(
  user: { id: string; email: string },
  cookieToken: string | undefined,
  linkToken: string | undefined,
): Promise<Result<string>> {
  const candidates = [...new Set([linkToken, cookieToken].filter((t): t is string => Boolean(t)))];
  let path: JoinPath | null = null;
  for (const token of candidates) {
    const draft = await readDraft(token);
    if (!draft) continue;
    path ??= draft.path;
    const sameEmail = !draft.email || normaliseEmail(draft.email) === normaliseEmail(user.email);
    if (!sameEmail) continue;
    if (token !== cookieToken) {
      await forgetDraftPassword(getDb(), token);
      await adoptDraft(token);
    }
    const next = await nextAfterDetails(token, user);
    if (next.ok) return next;
  }
  // The draft is gone (Join already finished, or the link was used before): carry on from the account itself.
  const memberships = await membershipsOf(getDb(), user.id);
  if (memberships[0]) return { ok: true, value: workspaceFor(memberships[0].kind) };
  const profile = await joinProfile(user.id);
  if (profile?.profileType === "member") return { ok: true, value: "/member" };
  if (profile?.profileType === "buyer" || profile?.profileType === "supplier") {
    // Their own sign-up page sends them on: to a pending join request, or to company details.
    return { ok: true, value: `/join/${profile.profileType}` };
  }
  return fail("INCOMPLETE", { message: path ? `/join/${path}` : "/join" });
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
