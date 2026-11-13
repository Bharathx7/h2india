"use server";

import { getDb } from "@h2india/core";
import {
  liftSuspension,
  startViewAs,
  suspendCompany,
  suspendUser,
  UserAdminError,
  userDetail,
  userIdByEmail,
} from "@h2india/core/admin/users";
import { grantOperatorRole, loadActor, OperatorRoleError, revokeOperatorRole } from "@h2india/core/authz";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { operatorSession, VIEW_AS_COOKIE } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Users (step 11.4): suspend and lift, suspend a company, View as user, and operator roles. Core checks permissions
// and audits with the reason. Always the operator's own session, never a viewed person.

type R = { ok: true } | { ok: false; error: string };

async function operator() {
  const session = await operatorSession();
  if (!session) throw new Error("Sign in again.");
  return { actor: await loadActor(getDb(), session.user.id), userId: session.user.id };
}

const fail = (error: unknown): R => {
  if (error instanceof UserAdminError || error instanceof OperatorRoleError) return { ok: false, error: error.message };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "Your role can't do this." };
  throw error;
};

async function run(work: () => Promise<unknown>, path: string): Promise<R> {
  try {
    await work();
  } catch (error) {
    return fail(error);
  }
  revalidatePath(path);
  return { ok: true };
}

export async function suspendAction(userId: string, reason: string, lift: boolean) {
  const { actor } = await operator();
  const context = await requestContext();
  return run(
    () =>
      lift
        ? liftSuspension(getDb(), actor, userId, reason, context)
        : suspendUser(getDb(), actor, userId, reason, context),
    `/admin/users/${userId}`,
  );
}

export async function suspendCompanyAction(userId: string, organisationId: string, reason: string | null) {
  const { actor } = await operator();
  return run(() => suspendCompany(getDb(), actor, organisationId, reason, undefined), `/admin/users/${userId}`);
}

/** Start View as user (657:328): sets the read-only cookie and opens the site as that person. */
export async function viewAsAction(userId: string, reason: string): Promise<R> {
  const { actor } = await operator();
  let started: { token: string; expiresAt: Date };
  try {
    started = await startViewAs(getDb(), actor, userId, reason, await requestContext());
  } catch (error) {
    return fail(error);
  }
  const jar = await cookies();
  const maxAge = Math.floor((started.expiresAt.getTime() - Date.now()) / 1000);
  jar.set(VIEW_AS_COOKIE, started.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  const detail = await userDetail(getDb(), actor, userId);
  jar.set(
    "h2_view_as_display",
    JSON.stringify({ name: detail?.person.name ?? "this person", until: started.expiresAt.toISOString() }),
    {
      sameSite: "lax",
      path: "/",
      maxAge,
    },
  );
  redirect("/");
}

export async function roleAction(email: string, role: string, add: boolean, reason: string): Promise<R> {
  const { actor } = await operator();
  const id = await userIdByEmail(getDb(), actor, email);
  if (!id) return { ok: false, error: "No account uses this email" };
  const context = await requestContext();
  return run(
    () =>
      add
        ? grantOperatorRole(getDb(), actor, { userId: id, role, reason }, context)
        : revokeOperatorRole(getDb(), actor, { userId: id, role, reason }, context),
    "/admin/users/roles",
  );
}
