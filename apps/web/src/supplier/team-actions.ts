"use server";

import { approveJoinRequest, changeMemberRole, JoinRequestError, rejectJoinRequest } from "@h2india/core/companies";
import {
  acceptInvitation,
  inviteMember,
  publishStorefront,
  removeMember,
  revokeInvitation,
  saveStorefrontDraft,
  StorefrontError,
  TeamError,
  type StorefrontForm,
} from "@h2india/core/supplier";
import { getDb } from "@h2india/core";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { loadActor } from "@h2india/core/authz";
import { supplierActor } from "./actions";

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
    if (error instanceof TeamError || error instanceof StorefrontError || error instanceof JoinRequestError) {
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
  return run(
    () =>
      approve
        ? approveJoinRequest({ adminId: actor.userId ?? "", requestId, context })
        : rejectJoinRequest({ adminId: actor.userId ?? "", requestId, context }),
    "/supplier/team",
  );
}

export async function acceptInvitationAction(token: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };
  const context = await requestContext();
  return run(() => acceptInvitation(getDb(), session.user.id, token, context), "/supplier");
}

export async function saveStorefrontAction(form: StorefrontForm, publish: boolean) {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(async () => {
    await saveStorefrontDraft(db, actor, supplier.organisationId, form);
    if (publish) await publishStorefront(db, actor, supplier.organisationId, context);
  }, "/supplier/storefront");
}
