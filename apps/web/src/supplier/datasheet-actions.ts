"use server";

import { decideField, ProductError, startExtraction, submitExtraction } from "@h2india/core/products";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actor";

// The datasheet reader (step 8.4). The engine runs in the worker; these only queue, record checks and submit.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function startDatasheetAction(fileId: string, categoryId: string): Promise<Result<{ id: string }>> {
  const { db, actor, supplier } = await supplierActor();
  try {
    const r = await startExtraction(db, actor, supplier.organisationId, {
      fileId,
      categoryId,
      context: await requestContext(),
    });
    return { ok: true, id: r.id };
  } catch (error) {
    if (error instanceof ProductError || error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
}

export async function decideFieldAction(
  id: string,
  key: string,
  state: "accepted" | "edited" | "absent",
  value?: unknown,
): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  try {
    await decideField(db, actor, supplier.organisationId, { id, key, state, value });
  } catch (error) {
    if (error instanceof ProductError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/supplier/products/datasheet/${id}`);
  return { ok: true };
}

export async function submitDatasheetAction(
  id: string,
  name: string,
  model: string,
): Promise<Result<{ productId: string; status: string }>> {
  const { db, actor, supplier } = await supplierActor();
  try {
    const r = await submitExtraction(db, actor, supplier.organisationId, {
      id,
      name,
      model,
      context: await requestContext(),
    });
    revalidatePath("/supplier/products");
    return { ok: true, ...r };
  } catch (error) {
    if (error instanceof ProductError) return { ok: false, error: error.message };
    throw error;
  }
}
