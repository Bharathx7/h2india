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
import { BuyerSettingsError, changeGstinByOperator } from "@h2india/core/buyer";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_LINKS } from "@/lib/auth-links";
import { auth, operatorSession, VIEW_AS_COOKIE } from "@/server/auth";
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
  if (error instanceof UserAdminError || error instanceof OperatorRoleError || error instanceof BuyerSettingsError)
    return { ok: false, error: error.message };
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
  const [detail, me] = await Promise.all([
    userDetail(getDb(), actor, userId),
    actor.userId ? userDetail(getDb(), actor, actor.userId) : null,
  ]);
  // What the banner (657:486) shows: no secrets, only names, times and the operator's own reason.
  jar.set(
    "h2_view_as_display",
    JSON.stringify({
      name: detail?.person.name ?? "this person",
      org: detail?.companies[0]?.name ?? null,
      until: started.expiresAt.toISOString(),
      started: new Date().toISOString(),
      by: me ? `${me.person.name}${me.operatorRoles[0] ? ` (${me.operatorRoles[0]})` : ""}` : null,
      reason: reason.trim().slice(0, 300),
    }),
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
  return run(async () => {
    if (!add) {
      await revokeOperatorRole(getDb(), actor, { userId: id, role, reason }, context);
      return;
    }
    await grantOperatorRole(getDb(), actor, { userId: id, role, reason }, context);
    await sendStaffPasswordLink(email);
  }, "/admin/users/roles");
}

/**
 * New staff get a "set your password" link for the back office (A183). A failed send doesn't undo the role: they can
 * ask again from Set or forgot your password on the staff sign-in.
 */
async function sendStaffPasswordLink(email: string) {
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: AUTH_LINKS.staffNewPassword } });
  } catch (error) {
    console.error("staff password link not sent", error instanceof Error ? error.message : error);
  }
}

/** Change a company's GSTIN (founder QC, 17 Nov 2026, A189): verification.edit, with a reason; the old one is retired. */
export async function changeCompanyGstinAction(organisationId: string, gstin: string, place: string, reason: string) {
  const { actor } = await operator();
  const context = await requestContext();
  return run(
    () => changeGstinByOperator(getDb(), actor, organisationId, { gstin, place, reason }, context),
    `/admin/users/companies/${organisationId}`,
  );
}
