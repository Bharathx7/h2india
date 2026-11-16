"use server";

import { addGstin, BuyerSettingsError, removeGstin, setDefaultGstin } from "@h2india/core/buyer";
import { CategoryRequestError, requestCategory } from "@h2india/core/catalogue/taxonomy";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actor";

// Supplier QC (16 Nov 2026): the supplier's GSTINs (Company details) and category requests. The company is always the
// person's own supplier company; GSTIN rules are the buyer's (same PAN, verified before default, one default).

type Result = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

async function run(work: () => Promise<unknown>, paths: string[]): Promise<Result> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BuyerSettingsError || error instanceof CategoryRequestError)
      return { ok: false, error: error.message, errors: (error as { errors?: Record<string, string> }).errors };
    if (error instanceof Error && /Not allowed|No role|not in the company/.test(error.message))
      return { ok: false, error: "Your role can't do this. Ask your company admin." };
    throw error;
  }
  for (const p of paths) revalidatePath(p);
  return { ok: true };
}

const COMPANY = ["/supplier/company", "/supplier/rfqs"];

export async function addSupplierGstinAction(gstin: string, place: string): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => addGstin(db, actor, supplier.organisationId, { gstin, place }, context), COMPANY);
}

export async function defaultSupplierGstinAction(id: string): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => setDefaultGstin(db, actor, supplier.organisationId, id, context), COMPANY);
}

export async function removeSupplierGstinAction(id: string): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => removeGstin(db, actor, supplier.organisationId, id, context), COMPANY);
}

export async function requestCategoryAction(input: {
  classId: string;
  parentId: string;
  label: string;
  description: string;
  example: string;
}): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(
    () =>
      requestCategory(
        db,
        actor,
        supplier.organisationId,
        {
          classId: input.classId,
          parentId: input.parentId || null,
          label: input.label,
          description: input.description,
          example: input.example,
        },
        context,
      ),
    ["/supplier/products/categories"],
  );
}
