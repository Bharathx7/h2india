"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { CategoryRequestError, decideCategoryRequest } from "@h2india/core/catalogue/taxonomy";
import { QueueError } from "@h2india/core/queues";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Category requests queue (supplier QC, 16 Nov 2026). Core checks queues.edit (and catalogue.edit to approve), claims
// the item so it is decided once, adds the category and tells the supplier.

type R = { ok: true; categoryId?: string | null } | { ok: false; error: string; errors?: Record<string, string> };

async function operator() {
  const session = await operatorSession();
  if (!session) throw new Error("Sign in again.");
  return loadActor(getDb(), session.user.id);
}

function failure(error: unknown): R {
  if (error instanceof CategoryRequestError) return { ok: false, error: error.message, errors: error.errors };
  if (error instanceof QueueError) return { ok: false, error: error.message };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "You can't decide category requests. Approving needs catalogue editing too." };
  throw error;
}

export async function approveCategoryAction(input: {
  id: string;
  classId: string;
  parentId: string;
  label: string;
}): Promise<R> {
  const actor = await operator();
  try {
    const { categoryId } = await decideCategoryRequest(
      getDb(),
      actor,
      {
        id: input.id,
        decision: "approve",
        classId: input.classId,
        parentId: input.parentId || null,
        label: input.label,
      },
      await requestContext(),
    );
    revalidatePath("/admin/queues/categories");
    revalidatePath("/admin/catalogue");
    return { ok: true, categoryId };
  } catch (error) {
    return failure(error);
  }
}

export async function rejectCategoryAction(id: string, reason: string): Promise<R> {
  const actor = await operator();
  if (!reason.trim()) return { ok: false, error: "Say why, so the supplier knows", errors: { reason: "Say why" } };
  try {
    await decideCategoryRequest(getDb(), actor, { id, decision: "reject", reason }, await requestContext());
    revalidatePath("/admin/queues/categories");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
