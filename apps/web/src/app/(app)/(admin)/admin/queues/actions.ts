"use server";

import { getDb } from "@h2india/core";
import { ForbiddenError, loadActor } from "@h2india/core/authz";
import { assignRevision, decideRevision, ProductError } from "@h2india/core/products";
import { decideStorefront, StorefrontError } from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Listings queue and Moderation · Listing (629:367, 632:695), step 8.3. Core checks queues.edit and audits.

type Note = {
  field: string;
  section: "category" | "details" | "specifications" | "documents" | "commercial";
  text: string;
};

async function actor() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  return loadActor(getDb(), session.user.id);
}

export async function decideListingAction(
  id: string,
  outcome: "Approved" | "Needs changes" | "Rejected",
  notes: Note[],
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await decideRevision(getDb(), await actor(), { id, outcome, notes, reason, context: await requestContext() });
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "You can see listings but not decide them." };
    if (error instanceof ProductError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/queues/listings");
  return { ok: true };
}

export async function assignListingAction(id: string) {
  await assignRevision(getDb(), await actor(), id);
  revalidatePath("/admin/queues/listings");
}

/** Bulk approve (629:367) covers only listings where every automated check passed; the rest are skipped. */
export async function bulkApproveAction(ids: string[]): Promise<number> {
  const db = getDb();
  const a = await actor();
  let done = 0;
  for (const id of ids) {
    try {
      await decideRevision(db, a, { id, outcome: "Approved", context: await requestContext() });
      done += 1;
    } catch (error) {
      if (!(error instanceof ProductError)) throw error;
    }
  }
  revalidatePath("/admin/queues/listings");
  return done;
}

/** Storefront changes (590:8 Publish changes) use the Listings queue until a lighter review is decided (A160). */
export async function decideStorefrontAction(
  id: string,
  approve: boolean,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await decideStorefront(getDb(), await actor(), { id, approve, note, context: await requestContext() });
  } catch (error) {
    if (error instanceof StorefrontError) return { ok: false, error: error.message };
    if (error instanceof ForbiddenError) return { ok: false, error: "You can see this but not decide it." };
    throw error;
  }
  revalidatePath("/admin/queues/listings");
  return { ok: true };
}
