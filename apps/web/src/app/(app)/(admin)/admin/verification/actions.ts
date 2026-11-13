"use server";

import { getDb } from "@h2india/core";
import { ForbiddenError, loadActor } from "@h2india/core/authz";
import { ClaimError, decideClaim } from "@h2india/core/companies";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

/** Approve or reject a profile claim (step 6.7). Core checks verification.edit and audits the decision. */
export async function decideClaimAction(claimId: string, approve: boolean, reason: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in again." };
  const db = getDb();
  try {
    await decideClaim(db, await loadActor(db, session.user.id), {
      claimId,
      approve,
      reason,
      context: await requestContext(),
    });
    revalidatePath("/admin/verification");
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false as const, error: "You can't decide claims." };
    if (error instanceof ClaimError) return { ok: false as const, error: error.message };
    throw error;
  }
}
