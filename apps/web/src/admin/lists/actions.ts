"use server";

import { getDb, StatusConflictError } from "@h2india/core";
import { ListingAdminError, setListingByOperator } from "@h2india/core/admin/lists";
import { ForbiddenError, loadActor } from "@h2india/core/authz";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// All products (founder QC, 17 Nov 2026): an operator pauses, resumes or takes down a listing with a reason. Core
// checks queues.edit, the allowed move and writes the history and audit log; the supplier is told in the app.

type R = { ok: true } | { ok: false; error: string };

export async function setListingAction(
  productId: string,
  to: "Paused" | "Live" | "Archived",
  reason: string,
): Promise<R> {
  const session = await operatorSession();
  if (!session) return { ok: false, error: "Sign in again." };
  const db = getDb();
  try {
    await setListingByOperator(db, await loadActor(db, session.user.id), {
      productId,
      to,
      reason,
      context: await requestContext(),
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "Your role can see listings but not change them." };
    if (error instanceof ListingAdminError) return { ok: false, error: error.message };
    if (error instanceof StatusConflictError)
      return { ok: false, error: "This listing changed a moment ago. Refresh to see it." };
    throw error;
  }
  revalidatePath("/admin/listings");
  return { ok: true };
}
