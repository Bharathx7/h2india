"use server";

import { Money } from "@h2india/core";
import { declineRfq, markViewed, RfqError, saveQuoteDraft, sendQuote, withdrawQuote } from "@h2india/core/rfq";
import { PAYMENT_PRESETS } from "@h2india/core/rfq/totals";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "../actor";

// Supplier RFQs and quotes (step 9.5). The company is always the person's own supplier company (supplierActor).

type R = { ok: true; quoteId?: string } | { ok: false; error: string; errors?: Record<string, string> };

export interface QuoteForm {
  unitPrice: string;
  gstRate: string;
  hsn: string;
  quantity: number;
  unit: string;
  description: string;
  rfqItemId: string | null;
  freight: string;
  leadTime: string;
  deliveryTerms: string;
  schedule: string;
  warranty: string;
  validUntil: string;
  changeNote: string;
  documents: string[];
  /** The supplier GSTIN the quote is issued under (supplier QC); "" keeps the one chosen or the default. */
  supplierGstinId: string;
}

const paise = (v: string) => {
  try {
    return v.trim() ? Money.parse(v) : 0n;
  } catch {
    return -1n;
  }
};
const bps = (v: string) => Math.round(Number(v.replace(/%/g, "").trim() || "0") * 100);
const whole = (v: string) => (v.trim() ? Math.floor(Number(v)) : null);

function fail(error: unknown): R {
  if (error instanceof RfqError) return { ok: false, error: error.message, errors: error.errors };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "Your role can't send quotes. Ask a company admin." };
  throw error;
}

async function save(rfqId: string, f: QuoteForm) {
  const { db, actor, supplier } = await supplierActor();
  const unit = paise(f.unitPrice);
  const freight = paise(f.freight);
  const errors: Record<string, string> = {};
  if (unit <= 0n) errors.unitPrice = "Enter the unit price before GST";
  if (freight < 0n) errors.freight = "Enter the freight in rupees, or 0";
  const rate = bps(f.gstRate);
  if (!f.gstRate.trim() || Number.isNaN(rate) || rate < 0 || rate > 10_000) errors.gstRate = "Enter the GST rate";
  if (!f.hsn.trim()) errors.hsn = "Enter the HSN code";
  if (Object.keys(errors).length) throw new RfqError("Check the highlighted fields", errors);
  const preset = PAYMENT_PRESETS.find((p) => p.label === f.schedule);
  return saveQuoteDraft(
    db,
    actor,
    supplier.organisationId,
    rfqId,
    {
      lines: [
        {
          rfqItemId: f.rfqItemId,
          description: f.description,
          hsn: f.hsn,
          quantity: f.quantity,
          unit: f.unit,
          unitPricePaise: unit,
          gstRateBps: rate,
        },
      ],
      freightPaise: freight,
      freightGstRateBps: rate,
      deliveryTerms: f.deliveryTerms,
      freightIncluded: /^delivered/i.test(f.deliveryTerms.trim()),
      leadTimeWeeks: whole(f.leadTime),
      validUntil: f.validUntil ? new Date(`${f.validUntil}T18:00:00+05:30`) : null,
      warrantyMonths: whole(f.warranty),
      changeNote: f.changeNote,
      documents: f.documents,
      schedule: preset?.lines ?? [],
      supplierGstinId: f.supplierGstinId || undefined,
    },
    await requestContext(),
  );
}

export async function saveQuoteAction(rfqId: string, f: QuoteForm): Promise<R> {
  try {
    const saved = await save(rfqId, f);
    return { ok: true, quoteId: saved.quoteId };
  } catch (error) {
    return fail(error);
  }
}

export async function sendQuoteAction(rfqId: string, f: QuoteForm): Promise<R> {
  try {
    const saved = await save(rfqId, f);
    const { db, actor, supplier } = await supplierActor();
    await sendQuote(db, actor, supplier.organisationId, saved.quoteId, await requestContext());
    revalidatePath(`/supplier/rfqs/${rfqId}`);
    revalidatePath("/supplier/rfqs");
    return { ok: true, quoteId: saved.quoteId };
  } catch (error) {
    return fail(error);
  }
}

export async function withdrawQuoteAction(rfqId: string, quoteId: string, reason: string, note: string): Promise<R> {
  try {
    const { db, actor, supplier } = await supplierActor();
    await withdrawQuote(db, actor, supplier.organisationId, quoteId, { reason, note }, await requestContext());
    revalidatePath(`/supplier/rfqs/${rfqId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function declineRfqAction(rfqId: string, reason: string, note: string): Promise<R> {
  try {
    const { db, actor, supplier } = await supplierActor();
    await declineRfq(db, actor, supplier.organisationId, rfqId, { reason, note }, await requestContext());
    revalidatePath(`/supplier/rfqs/${rfqId}`);
    revalidatePath("/supplier/rfqs");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Opening the RFQ marks it Viewed for the buyer (560:8). Called from an effect, never on prefetch. */
export async function viewedAction(rfqId: string) {
  const { db, actor, supplier } = await supplierActor();
  await markViewed(db, actor, supplier.organisationId, rfqId);
}
