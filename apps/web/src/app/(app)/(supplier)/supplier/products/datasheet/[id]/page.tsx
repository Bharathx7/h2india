import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { effectiveSchema } from "@h2india/core/catalogue/taxonomy";
import { getExtraction } from "@h2india/core/products";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatasheetReview, type ReviewField } from "@/supplier/DatasheetReview";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Check what we read from your datasheet (610:8; fields 611:8), step 8.4. The supplier's own extraction only.
export const metadata: Metadata = { title: "Check your datasheet · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DatasheetReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await requireSupplier(`/supplier/products/datasheet/${id}`);
  const db = getDb();
  const x = await getExtraction(db, scopeFor(page.actor), page.supplier.organisationId, id);
  if (!x) notFound();
  const defs = await effectiveSchema(db, x.categoryId, { includeSample: true });
  const fields: ReviewField[] = x.fields
    .filter((f) => f.attributeKey !== "name" && f.attributeKey !== "model")
    .map((f) => {
      const d = defs.find((y) => y.key === f.attributeKey);
      return {
        key: f.attributeKey,
        label: d?.label ?? f.attributeKey,
        unit: d?.unit ?? f.unit ?? null,
        group: d?.displayGroup ?? "Other",
        type: d?.type ?? "text",
        value: f.value,
        confidence: f.confidence,
        sourceText: f.sourceText,
        sourcePage: f.sourcePage,
        problem: f.problem,
        decision: x.decisions[f.attributeKey],
      };
    });
  const read = x.fields.find((f) => f.attributeKey === "name")?.value;
  const name = typeof read === "string" ? read : "";
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <Link href="/supplier/products" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Products
      </Link>
      <div>
        <h1 className="type-h2">Check what we read from your datasheet</h1>
        <p className="type-caption text-secondary">
          {x.status === "Submitted" ? "Sent for review" : "Draft"} · uploaded{" "}
          {x.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
        </p>
      </div>
      <DatasheetReview
        id={x.id}
        status={x.status}
        fileName="the datasheet"
        fields={fields}
        name={name}
        ready={x.status === "Ready" && page.supplier.seat.permissions.has("product.manage")}
      />
    </SupplierShell>
  );
}
