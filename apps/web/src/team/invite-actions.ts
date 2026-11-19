"use server";

import { getDb } from "@h2india/core";
import { ForbiddenError, loadActor } from "@h2india/core/authz";
import { resendInvitation, TeamError } from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Resend invitation on the shared Team panel (founder, 19 Nov 2026), for supplier Team and buyer Company · Team.
// Core checks team.manage, the resend wait and writes the audit log.

/** The company whose team this person manages, as supplier/team-actions.ts picks it: supplier first, then buyer. */
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
  return { db, actor, organisationId: pick[0] };
}

export async function resendInvitationAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof id !== "string") return { ok: false, error: "Something went wrong. Try again." };
  const { db, actor, organisationId } = await teamActor();
  const context = await requestContext();
  try {
    await resendInvitation(db, actor, organisationId, id, context);
  } catch (error) {
    if (error instanceof TeamError) return { ok: false, error: error.message };
    if (error instanceof ForbiddenError) return { ok: false, error: "Only a company admin can resend invitations." };
    throw error;
  }
  revalidatePath("/supplier/team");
  revalidatePath("/buyer/company");
  return { ok: true };
}
