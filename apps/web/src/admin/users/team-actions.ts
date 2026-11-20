"use server";

import { getDb } from "@h2india/core";
import { addStaffMember, deleteOperatorRole, saveOperatorRole, setStaffSections } from "@h2india/core/admin/staff";
import { loadActor, OperatorRoleError, revokeOperatorRole, StaffError } from "@h2india/core/authz";
import { revalidatePath } from "next/cache";
import { AUTH_LINKS } from "@/lib/auth-links";
import { auth, operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Team and roles (founder, 20 Nov 2026): add a team member, limit them to content sections, remove them from a role,
// and make custom roles. Core checks roles.manage, Confirm it's you for sensitive access, and audits with the reason.

export type TeamResult = { ok: true; id?: string } | { ok: false; error: string; confirm?: boolean };

async function operator() {
  const session = await operatorSession();
  if (!session) throw new Error("Sign in again.");
  return { actor: await loadActor(getDb(), session.user.id), userId: session.user.id };
}

const fail = (error: unknown): TeamResult => {
  if (error instanceof StaffError) return { ok: false, error: error.message, confirm: error.code === "CONFIRM" };
  if (error instanceof OperatorRoleError) return { ok: false, error: error.message };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "Only a Super admin manages the team." };
  throw error;
};

const PATH = "/admin/users/roles";

/** New staff get a "set your password" link for the back office (A183); a failed send never undoes the change. */
async function sendPasswordLink(email: string) {
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: AUTH_LINKS.staffNewPassword } });
  } catch (error) {
    console.error("staff password link not sent", error instanceof Error ? error.message : error);
  }
}

export async function addTeamMemberAction(input: {
  email: string;
  name: string;
  role: string;
  sections: string[] | null;
  reason: string;
}): Promise<TeamResult> {
  const { actor } = await operator();
  const context = await requestContext();
  try {
    const made = await addStaffMember(getDb(), actor, input, context);
    await sendPasswordLink(input.email.trim().toLowerCase());
    revalidatePath(PATH);
    return { ok: true, id: made.userId };
  } catch (error) {
    return fail(error);
  }
}

export async function setSectionsAction(userId: string, sections: string[] | null, reason: string) {
  const { actor } = await operator();
  const context = await requestContext();
  try {
    await setStaffSections(getDb(), actor, { userId, sections, reason }, context);
    revalidatePath(PATH);
    return { ok: true } as TeamResult;
  } catch (error) {
    return fail(error);
  }
}

export async function removeFromRoleAction(userId: string, role: string, reason: string): Promise<TeamResult> {
  const { actor } = await operator();
  const context = await requestContext();
  if (!reason.trim()) return { ok: false, error: "Say why, for the record." };
  try {
    await revokeOperatorRole(getDb(), actor, { userId, role, reason }, context);
    revalidatePath(PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveRoleAction(input: {
  roleId?: string;
  name: string;
  description: string;
  permissions: string[];
  reason: string;
}): Promise<TeamResult> {
  const { actor } = await operator();
  const context = await requestContext();
  try {
    const saved = await saveOperatorRole(getDb(), actor, input, context);
    revalidatePath(PATH);
    return { ok: true, id: saved.roleId };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRoleAction(roleId: string, reason: string): Promise<TeamResult> {
  const { actor } = await operator();
  const context = await requestContext();
  try {
    await deleteOperatorRole(getDb(), actor, { roleId, reason }, context);
    revalidatePath(PATH);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
