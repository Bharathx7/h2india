"use server";

import { Money } from "@h2india/core";
import {
  deleteProduct,
  ProductError,
  saveProduct,
  saveQuickStock,
  setListingStatus,
  startImport,
  type ProductInput,
  type QuickChange,
} from "@h2india/core/products";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actions";

// The product editor and Products list (step 8.3). The company is the person's own supplier company.

/** What the editor sends: plain values; money in rupees as typed ("48,500"). */
export interface EditorForm {
  id?: string;
  categoryId: string;
  name: string;
  model: string;
  summary: string;
  madeInIndia: boolean;
  attributes: Record<string, unknown>;
  attributeNotes: Record<string, string>;
  certificates: { name: string; number?: string; validUntil?: string }[];
  documents: { label: string; fileId: string }[];
  images: { fileId: string }[];
  pricing: "quote" | "fixed" | "indicative";
  price: string;
  gstPercent: string;
  indicativeMin: string;
  indicativeMax: string;
  leadTimeMinWeeks: string;
  leadTimeMaxWeeks: string;
  minOrder: string;
  stock: "made_to_order" | "in_stock";
  stockQty: string;
  sku: string;
}

const int = (v: string) => (v.trim() ? Math.max(0, Math.round(Number(v.replace(/,/g, "")))) : null);
const money = (v: string) => {
  try {
    return v.trim() ? Money.parse(v) : null;
  } catch {
    return null;
  }
};

function toInput(f: EditorForm): ProductInput {
  return {
    categoryId: f.categoryId,
    name: f.name.trim(),
    model: f.model.trim() || null,
    summary: f.summary.trim() || null,
    madeInIndia: f.madeInIndia,
    attributes: f.attributes,
    attributeNotes: Object.fromEntries(Object.entries(f.attributeNotes).filter(([, v]) => v.trim())),
    certificates: f.certificates.filter((c) => c.name.trim()),
    documents: f.documents,
    images: f.images,
    pricing: f.pricing,
    pricePaise: f.pricing === "fixed" ? money(f.price) : null,
    gstRateBps: f.pricing === "fixed" && f.gstPercent.trim() ? Math.round(Number(f.gstPercent) * 100) : null,
    indicativeMinPaise: f.pricing === "indicative" ? money(f.indicativeMin) : null,
    indicativeMaxPaise: f.pricing === "indicative" ? money(f.indicativeMax) : null,
    leadTimeMinWeeks: int(f.leadTimeMinWeeks),
    leadTimeMaxWeeks: int(f.leadTimeMaxWeeks) ?? int(f.leadTimeMinWeeks),
    minOrder: int(f.minOrder),
    stock: f.stock,
    stockQty: f.stock === "in_stock" ? int(f.stockQty) : null,
    sku: f.sku.trim() || null,
  };
}

export async function saveProductAction(
  form: EditorForm,
  submit: boolean,
): Promise<{ ok: true; id: string; status: string } | { ok: false; error: string; errors: Record<string, string> }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    const r = await saveProduct(db, actor, supplier.organisationId, {
      id: form.id,
      data: toInput(form),
      submit,
      context: await requestContext(),
    });
    revalidatePath("/supplier/products");
    revalidatePath("/supplier");
    return { ok: true, ...r };
  } catch (error) {
    if (error instanceof ProductError) return { ok: false, error: error.message, errors: error.errors };
    throw error;
  }
}

export async function setListingStatusAction(ids: string[], to: "Paused" | "Live" | "Archived"): Promise<number> {
  const { db, actor, supplier } = await supplierActor();
  const n = await setListingStatus(db, actor, supplier.organisationId, { ids, to, context: await requestContext() });
  revalidatePath("/supplier/products");
  return n;
}

export async function deleteProductAction(id: string): Promise<void> {
  const { db, actor, supplier } = await supplierActor();
  await deleteProduct(db, actor, supplier.organisationId, id, await requestContext());
  revalidatePath("/supplier/products");
}

export async function startImportAction(
  fileId: string,
  fileName: string,
  categoryId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    await startImport(db, actor, supplier.organisationId, {
      fileId,
      fileName,
      categoryId,
      context: await requestContext(),
    });
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/supplier/products/import");
  return { ok: true };
}

export async function saveQuickStockAction(
  changes: QuickChange[],
): Promise<{ ok: true; saved: number } | { ok: false; problems: Record<string, string> }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    const saved = await saveQuickStock(db, actor, supplier.organisationId, changes, await requestContext());
    revalidatePath("/supplier/products/quick");
    revalidatePath("/supplier/products");
    return { ok: true, saved };
  } catch (error) {
    if (error instanceof ProductError) return { ok: false, problems: error.errors };
    throw error;
  }
}
