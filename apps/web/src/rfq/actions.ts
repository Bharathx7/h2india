"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { buyerOf } from "@h2india/core/buyer";
import { effectiveSchema } from "@h2india/core/catalogue/taxonomy";
import {
  createRfq,
  deleteRfqDraft,
  matchSuppliers,
  RfqError,
  submitRfq,
  updateRfqDraft,
  type RfqDraftInput,
} from "@h2india/core/rfq";
import { revalidatePath } from "next/cache";
import { showSample } from "@/cms/sample";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { istDay, istDeadline, type WizardState } from "./wizard-state";

// The RFQ wizard's server side (step 9.3). Drafts save for a signed-in buyer; a signed-out visitor's draft stays in
// their browser until they sign in or join. The company always comes from the session, never from the form.

type Saved =
  { ok: true; id: string; reference: string } | { ok: false; error: string; errors?: Record<string, string> };

async function buyerSession() {
  const session = await getSession();
  if (!session) return null;
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const b = await buyerOf(db, actor);
  return b ? { db, actor, org: b.organisationId } : null;
}

function toDraft(s: WizardState): RfqDraftInput {
  const qty = Number(s.quantity);
  const specs = Object.fromEntries(Object.entries(s.specs).filter(([, v]) => v.trim()));
  return {
    title: s.title,
    categoryId: s.categoryId || null,
    requirements: s.requirements,
    deliverySiteId: s.siteId || null,
    billingGstinId: s.gstinId || null,
    requiredBy: s.requiredBy ? istDay(s.requiredBy) : null,
    offerDeadline: s.offerDeadline ? istDeadline(s.offerDeadline) : null,
    deliveryTerms: s.deliveryTerms || null,
    paymentTerms: s.paymentTerms || null,
    attachments: s.attachments.map((a) => a.fileId),
    source: s.source,
    items: s.title.trim()
      ? [
          {
            productId: s.productId ?? null,
            description: s.title,
            quantity: Number.isInteger(qty) && qty > 0 ? qty : 1,
            unit: s.unit,
            specs,
          },
        ]
      : [],
    supplierIds: s.supplierIds,
  };
}

function failure(error: unknown): Saved {
  if (error instanceof RfqError) return { ok: false, error: error.message, errors: error.errors };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "Your role can't request quotes. Ask a company admin." };
  throw error;
}

/** Save the wizard as a draft (creates it the first time). */
export async function saveRfqDraft(s: WizardState): Promise<Saved> {
  const b = await buyerSession();
  if (!b) return { ok: false, error: "Sign in to save your request." };
  const context = await requestContext();
  try {
    if (s.draftId) {
      await updateRfqDraft(b.db, b.actor, b.org, s.draftId, toDraft(s), context);
      return { ok: true, id: s.draftId, reference: "" };
    }
    const made = await createRfq(b.db, b.actor, b.org, toDraft(s), context);
    return { ok: true, ...made };
  } catch (error) {
    return failure(error);
  }
}

/** Save and send: to one supplier it goes out now; to more, H2 India checks it first. */
export async function sendRfq(
  s: WizardState,
): Promise<{ ok: true; id: string; status: string } | { ok: false; error: string; errors?: Record<string, string> }> {
  const saved = await saveRfqDraft(s);
  if (!saved.ok) return saved;
  const b = await buyerSession();
  if (!b) return { ok: false, error: "Sign in to send your request." };
  try {
    const status = await submitRfq(b.db, b.actor, b.org, saved.id, await requestContext());
    revalidatePath("/buyer");
    revalidatePath("/buyer/rfqs");
    return { ok: true, id: saved.id, status };
  } catch (error) {
    const f = failure(error);
    return f.ok ? { ok: false, error: "Try again." } : f;
  }
}

export async function deleteDraftAction(id: string) {
  const b = await buyerSession();
  if (!b) return { ok: false as const, error: "Sign in again." };
  await deleteRfqDraft(b.db, b.actor, b.org, id);
  return { ok: true as const };
}

/** Verified suppliers that match the category (step 2). */
export async function suppliersAction(categoryId: string, state: string) {
  return matchSuppliers(getDb(), { categoryId: categoryId || null, state: state || null, includeSample: showSample() });
}

/** The category's key specifications (step 1): required and filterable attributes, as the schema orders them. */
export async function specFieldsAction(categoryId: string) {
  if (!categoryId) return [];
  try {
    const defs = await effectiveSchema(getDb(), categoryId, { includeSample: showSample() });
    return defs
      .filter((d) => d.required || d.filterable)
      .slice(0, 6)
      .map((d) => ({
        key: d.key,
        label: d.label,
        type: d.type,
        unit: d.unit,
        min: d.min,
        max: d.max,
        options: d.options,
      }));
  } catch {
    return [];
  }
}
