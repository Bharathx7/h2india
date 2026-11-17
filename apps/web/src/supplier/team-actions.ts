"use server";

import {
  approveJoinRequest,
  changeMemberRole,
  JoinRequestError,
  LastAdminError,
  notifyRequester,
  rejectJoinRequest,
} from "@h2india/core/companies";
import {
  acceptInvitation,
  inviteMember,
  removeMember,
  revokeInvitation,
  StorefrontError,
  TeamError,
} from "@h2india/core/supplier";
import { getDb } from "@h2india/core";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { currentTermsVersion } from "@/trust/terms";
import {
  loadActor,
  MemberAccessError,
  RolePermissionError,
  setMemberAccess,
  setRolePermission,
  type AccessChoice,
} from "@h2india/core/authz";

/** The company whose team this person manages: their supplier company, else their buyer company. */
async function teamActor() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const seats = [...actor.companies.entries()];
  const pick =
    seats.find(([, s]) => s.permissions.has("team.manage") && (s.kind === "supplier" || s.kind === "both")) ??
    seats.find(([, s]) => s.permissions.has("team.manage")) ??
    seats[0];
  if (!pick) throw new Error("This account has no company.");
  return { db, actor, supplier: { organisationId: pick[0] } };
}

// Team and permissions, invitations and the storefront (step 8.7). Core checks team.manage / storefront.manage.

type Result = { ok: true } | { ok: false; error: string };

async function run(work: () => Promise<unknown>, path: string, also?: string): Promise<Result> {
  try {
    await work();
  } catch (error) {
    if (
      error instanceof TeamError ||
      error instanceof StorefrontError ||
      error instanceof JoinRequestError ||
      error instanceof LastAdminError ||
      error instanceof RolePermissionError ||
      error instanceof MemberAccessError
    ) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && /Not allowed|not in the company|No role/.test(error.message))
      return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(path);
  revalidatePath(also ?? "/buyer/company");
  return { ok: true };
}

export async function inviteMemberAction(email: string, role: string) {
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(
    () => inviteMember(db, actor, supplier.organisationId, { email, role, context }),
    "/supplier/team",
    "/buyer/company",
  );
}

/** The access a form sends, checked for shape (callable from any browser); core checks the permissions themselves. */
function accessOf(input: unknown): AccessChoice | null {
  if (typeof input !== "object" || input === null) return null;
  const { admin, permissions } = input as { admin?: unknown; permissions?: unknown };
  if (typeof admin !== "boolean" || !Array.isArray(permissions)) return null;
  if (!permissions.every((p): p is string => typeof p === "string")) return null;
  return { admin, permissions };
}

/** Add member (founder QC, 17 Nov 2026): email plus the ticked access, sent as an invitation. */
export async function inviteWithAccessAction(email: string, access: AccessChoice) {
  const choice = accessOf(access);
  if (typeof email !== "string" || !choice) return { ok: false as const, error: "Something went wrong. Try again." };
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(
    () => inviteMember(db, actor, supplier.organisationId, { email, access: choice, context }),
    "/supplier/team",
    "/buyer/company",
  );
}

/** Edit access for one member (founder QC, 17 Nov 2026). Core keeps at least one Admin. */
export async function setMemberAccessAction(userId: string, access: AccessChoice) {
  const choice = accessOf(access);
  if (typeof userId !== "string" || !choice) return { ok: false as const, error: "Something went wrong. Try again." };
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(
    () => setMemberAccess(db, actor, { organisationId: supplier.organisationId, userId, access: choice }, context),
    "/supplier/team",
    "/buyer/company",
  );
}

export async function revokeInvitationAction(id: string) {
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(() => revokeInvitation(db, actor, supplier.organisationId, id, context), "/supplier/team");
}

export async function changeRoleAction(userId: string, role: string) {
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(
    () => changeMemberRole(db, actor, { organisationId: supplier.organisationId, userId, role }, context),
    "/supplier/team",
  );
}

export async function removeMemberAction(userId: string) {
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(() => removeMember(db, actor, supplier.organisationId, userId, context), "/supplier/team");
}

export async function answerJoinRequestAction(requestId: string, approve: boolean) {
  const { actor } = await teamActor();
  const context = await requestContext();
  const result = await run(
    () =>
      approve
        ? approveJoinRequest({ adminId: actor.userId ?? "", requestId, context })
        : rejectJoinRequest({ adminId: actor.userId ?? "", requestId, context }),
    "/supplier/team",
  );
  // The person who asked is told the answer (founder QC, 17 Nov 2026: nobody was); a failed send doesn't undo it.
  if (result.ok)
    await notifyRequester(requestId).catch((e: unknown) => {
      console.error("join answer notice failed", e);
    });
  return result;
}

export async function acceptInvitationAction(token: string, agreedToTerms: boolean): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };
  const context = await requestContext();
  // The version recorded is the one published now, as Join records it (admin QC).
  const termsVersion = agreedToTerms ? await currentTermsVersion() : undefined;
  return run(
    () => acceptInvitation(getDb(), session.user.id, token, context, undefined, { termsVersion }),
    "/supplier",
  );
}

/** Team's permission grid (founder QC, 17 Nov 2026): tick or clear one permission for one role of this company. */
export async function setRolePermissionAction(role: string, permission: string, on: boolean) {
  // Callable from any browser: core checks the role and permission against the catalogue and team.manage.
  if (typeof role !== "string" || typeof permission !== "string" || typeof on !== "boolean")
    return { ok: false as const, error: "Something went wrong. Try again." };
  const { db, actor, supplier } = await teamActor();
  const context = await requestContext();
  return run(
    () =>
      setRolePermission(
        db,
        actor,
        {
          organisationId: supplier.organisationId,
          role,
          permission,
          on,
        },
        context,
      ),
    "/supplier/team",
    "/buyer/company",
  );
}
