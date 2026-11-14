"use server";

import { getDb, Money } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import {
  addDelegation,
  addGstin,
  addToList,
  buyerOf,
  BuyerSettingsError,
  createList,
  deleteList,
  endDelegation,
  ListError,
  removeDeliverySite,
  removeFromList,
  removeGstin,
  saveApprovalRules,
  saveDeliverySite,
  setDefaultGstin,
  setPasskeyRoles,
  signOutSessions,
  updateCompanyProfile,
  type ProfileInput,
  type SiteInput,
} from "@h2india/core/buyer";
import { changeMemberRole } from "@h2india/core/companies";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Buyer company settings and project lists (step 9.1). The company is the person's own buyer company.

type Result = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

async function buyer() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const b = await buyerOf(db, actor);
  if (!b) throw new Error("This account has no buyer company.");
  return { db, actor, org: b.organisationId, sessionId: session.session.id };
}

async function run(work: () => Promise<unknown>, path = "/buyer/company"): Promise<Result> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BuyerSettingsError || error instanceof ListError) {
      return { ok: false, error: error.message, errors: (error as { errors?: Record<string, string> }).errors };
    }
    if (error instanceof Error && /Not allowed|No role|not in the company/.test(error.message))
      return { ok: false, error: "Only a company admin can do this." };
    throw error;
  }
  revalidatePath(path);
  revalidatePath("/buyer");
  return { ok: true };
}

const paise = (v: string) => (v.trim() ? Money.parse(v) : null);

export async function profileAction(input: ProfileInput) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => updateCompanyProfile(db, actor, org, input, context));
}
export async function addGstinAction(gstin: string, place: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => addGstin(db, actor, org, { gstin, place }, context));
}
export async function defaultGstinAction(id: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => setDefaultGstin(db, actor, org, id, context));
}
export async function removeGstinAction(id: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => removeGstin(db, actor, org, id, context));
}
export async function saveSiteAction(input: SiteInput & { id?: string }) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => saveDeliverySite(db, actor, org, input, context));
}
export async function removeSiteAction(id: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => removeDeliverySite(db, actor, org, id, context));
}
export async function rulesAction(input: {
  above: string;
  approverId: string;
  second: boolean;
  secondAbove: string;
  secondApproverId: string;
}) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() =>
    saveApprovalRules(
      db,
      actor,
      org,
      {
        approvalAbovePaise: paise(input.above),
        approverId: input.approverId || null,
        secondApproval: input.second,
        secondAbovePaise: paise(input.secondAbove),
        secondApproverId: input.secondApproverId || null,
      },
      context,
    ),
  );
}
export async function delegationAction(fromUserId: string, toUserId: string, startsOn: string, endsOn: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() =>
    addDelegation(
      db,
      actor,
      org,
      {
        fromUserId,
        toUserId,
        startsOn: new Date(`${startsOn}T00:00:00+05:30`),
        endsOn: new Date(`${endsOn}T23:59:59+05:30`),
      },
      context,
    ),
  );
}
export async function endDelegationAction(id: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => endDelegation(db, actor, org, id, context));
}
export async function passkeyRolesAction(roles: string[]) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() => setPasskeyRoles(db, actor, org, roles, context));
}
export async function signOutAction(sessionId: string | null) {
  const { db, actor, org, sessionId: mine } = await buyer();
  const context = await requestContext();
  return run(() => signOutSessions(db, actor, org, sessionId ? { sessionId } : { allExcept: mine }, context));
}
export async function limitAction(userId: string, role: string, limit: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(() =>
    changeMemberRole(db, actor, { organisationId: org, userId, role, orderLimitPaise: paise(limit) }, context),
  );
}
export async function newListAction(name: string) {
  const { db, actor, org } = await buyer();
  return run(() => createList(db, actor, org, name), "/buyer/lists");
}
export async function addToListAction(listId: string, productId: string) {
  const { db, actor, org } = await buyer();
  return run(() => addToList(db, actor, org, listId, productId), "/buyer/lists");
}
export async function removeFromListAction(listId: string, productIds: string[]) {
  const { db, actor, org } = await buyer();
  return run(() => removeFromList(db, actor, org, listId, productIds), "/buyer/lists");
}
export async function deleteListAction(listId: string) {
  const { db, actor, org } = await buyer();
  return run(() => deleteList(db, actor, org, listId), "/buyer/lists");
}
