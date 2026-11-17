"use server";

import {
  publishStorefront,
  saveStorefrontDraft,
  StorefrontError,
  withdrawStorefront,
  type StorefrontForm,
} from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actor";

// The storefront editor's saves (590:8, step 8.7; rebuilt in founder QC, 17 Nov 2026). Core checks storefront.manage,
// the fields and that a sent draft differs from the live storefront; the company comes from the session.

type Result = { ok: true } | { ok: false; error: string; problems?: Record<string, string> };

async function run(work: () => Promise<unknown>): Promise<Result> {
  try {
    await work();
  } catch (error) {
    if (error instanceof StorefrontError) return { ok: false, error: error.message, problems: error.problems };
    if (error instanceof Error && /Not allowed/.test(error.message))
      return { ok: false, error: "Your role can't change the storefront. Ask a company admin." };
    throw error;
  }
  revalidatePath("/supplier/storefront");
  revalidatePath("/supplier");
  return { ok: true };
}

/** Save draft, or Save and send for review (`send`). */
export async function saveStorefrontAction(form: StorefrontForm, send: boolean): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(async () => {
    await saveStorefrontDraft(db, actor, supplier.organisationId, form);
    if (send) await publishStorefront(db, actor, supplier.organisationId, context);
  });
}

/** Take back to edit: the change leaves the review queue and becomes a draft again. */
export async function withdrawStorefrontAction(): Promise<Result> {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => withdrawStorefront(db, actor, supplier.organisationId, context));
}
