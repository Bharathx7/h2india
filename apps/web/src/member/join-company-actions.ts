"use server";

import { getDb } from "@h2india/core";
import {
  cancelJoinRequest,
  JoinRequestError,
  notifyAdminsOfRequest,
  remindJoinRequest,
  requestToJoin,
  searchCompanies,
  type CompanyMatch,
} from "@h2india/core/companies";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Join a company (founder QC, 17 Nov 2026): a member finds their company and asks its admin to let them in. The same
// core functions as Join step 2 and the Join request page; the admins are emailed as there.

type Result<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; error: string };

const PATH = "/member/join-company";

export async function findCompaniesAction(query: string): Promise<Result<CompanyMatch[]>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  if (typeof query !== "string") return { ok: true, value: [] };
  return { ok: true, value: await searchCompanies(getDb(), query.slice(0, 80)) };
}

export async function askToJoinAction(organisationId: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  try {
    const request = await requestToJoin({ userId: session.user.id, organisationId, context: await requestContext() });
    if (request.created)
      await notifyAdminsOfRequest(request.id).catch((e: unknown) => {
        console.error("join a company: emailing the admins failed", e);
      });
  } catch (error) {
    if (error instanceof JoinRequestError && error.code === "ALREADY_MEMBER")
      return { ok: false, error: "You're already part of this company." };
    throw error;
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function remindAdminAction(requestId: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  try {
    await remindJoinRequest({ userId: session.user.id, requestId });
    await notifyAdminsOfRequest(requestId, { reminder: true });
  } catch (error) {
    if (error instanceof JoinRequestError) return { ok: false, error: "You can send one reminder a day." };
    throw error;
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function cancelRequestAction(requestId: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  try {
    await cancelJoinRequest({ userId: session.user.id, requestId, context: await requestContext() });
  } catch (error) {
    if (error instanceof JoinRequestError) return { ok: false, error: "This request can't be cancelled now." };
    throw error;
  }
  revalidatePath(PATH);
  return { ok: true };
}
