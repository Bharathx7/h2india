"use server";

import { submitForReview, SupplierReviewError } from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actor";

// Supplier workspace actions (Stage 8). Each loads the person's own supplier company (supplierActor); nothing takes a
// company id.

export async function submitForReviewAction(): Promise<{ ok: boolean; error?: string }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    await submitForReview(db, actor, supplier.organisationId, await requestContext());
  } catch (error) {
    if (error instanceof SupplierReviewError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/supplier");
  revalidatePath("/supplier/verification");
  return { ok: true };
}
