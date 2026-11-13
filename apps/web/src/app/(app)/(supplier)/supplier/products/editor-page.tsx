import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { effectiveSchema } from "@h2india/core/catalogue/taxonomy";
import { editableProduct } from "@h2india/core/products";
import { formatIstDayMonth } from "@h2india/core/time";
import { notFound } from "next/navigation";
import { catalogue } from "@/marketplace/data";
import { ProductEditor, type EditorStart } from "@/supplier/ProductEditor";
import { SupplierShell, type SupplierPage } from "@/supplier/shell";

const rupees = (p: bigint | null) => (p ? (Number(p) / 100).toString() : "");

/** The editor for a new product (with its chosen category) or an existing one. */
export async function EditorPage({
  page,
  productId,
  categoryId,
}: {
  page: SupplierPage;
  productId?: string;
  categoryId?: string;
}) {
  const db = getDb();
  const s = page.supplier;
  const found = productId ? await editableProduct(db, scopeFor(page.actor), s.organisationId, productId) : null;
  if (productId && !found) notFound();
  const w = found?.working;
  const category = categoryId ?? w?.categoryId;
  if (!category) notFound();
  const [defs, cat] = await Promise.all([effectiveSchema(db, category, { includeSample: true }), catalogue()]);
  const categories = cat.classes.flatMap((c) =>
    c.categories.flatMap((k) => [
      ...(k.children.length ? [] : [{ id: k.id, label: `${c.label} › ${k.label}` }]),
      ...k.children.map((x) => ({ id: x.id, label: `${c.label} › ${k.label} › ${x.label}` })),
    ]),
  );
  const review = found?.lastReview;
  const start: EditorStart = {
    id: found?.product.id,
    status: found?.shown ?? "Draft",
    live: found ? found.product.status === "Live" || found.product.status === "Paused" : false,
    slug: found?.product.slug ?? null,
    model: w?.model ?? "",
    notes: review && (review.status === "Needs changes" || found.shown === "Needs changes") ? review.notes : [],
    reviewedOn: review?.decidedAt ? formatIstDayMonth(review.decidedAt) : null,
    rejectReason: found?.product.status === "Rejected" ? (found.product.rejectReason ?? review?.reason ?? "") : null,
    form: {
      id: found?.product.id,
      categoryId: category,
      name: w?.name ?? "",
      model: w?.model ?? "",
      summary: w?.summary ?? "",
      madeInIndia: w?.madeInIndia ?? false,
      attributes: w?.attributes ?? {},
      attributeNotes: w?.attributeNotes ?? {},
      certificates: w?.certificates ?? [],
      documents: w?.documents ?? [],
      images: w?.images ?? [],
      pricing: (w?.pricing ?? "quote") as "quote" | "fixed" | "indicative",
      price: rupees(w?.pricePaise ?? null),
      gstPercent: w?.gstRateBps ? String(w.gstRateBps / 100) : "",
      indicativeMin: rupees(w?.indicativeMinPaise ?? null),
      indicativeMax: rupees(w?.indicativeMaxPaise ?? null),
      leadTimeMinWeeks: w?.leadTimeMinWeeks ? String(w.leadTimeMinWeeks) : "",
      leadTimeMaxWeeks: w?.leadTimeMaxWeeks ? String(w.leadTimeMaxWeeks) : "",
      minOrder: w?.minOrder ? String(w.minOrder) : "",
      stock: (w?.stock ?? "made_to_order") as "made_to_order" | "in_stock",
      stockQty: w?.stockQty !== null && w?.stockQty !== undefined ? String(w.stockQty) : "",
      sku: w?.sku ?? "",
    },
  };
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <ProductEditor
        start={start}
        defs={defs}
        categories={categories}
        organisationId={s.organisationId}
        canEdit={s.seat.permissions.has("product.manage")}
      />
    </SupplierShell>
  );
}
