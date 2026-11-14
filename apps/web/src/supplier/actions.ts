"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { submitForReview, SupplierReviewError, supplierOf } from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Supplier workspace actions (Stage 8). Each loads the person's own supplier company; nothing takes a company id.

export async function supplierActor() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  if (!supplier) throw new Error("This account has no supplier company.");
  return { db, actor, supplier };
}

export async function submitForReviewAction(): Promise<{ ok: boolean; error?: string }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    await submitForReview(db, actor, supplier.organisationId, await requestContext());
  } catch (error) {
    if (error instanceof SupplierReviewError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/supplier");
  return { ok: true };
}
