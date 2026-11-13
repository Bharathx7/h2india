import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@h2india/ui";
import { catalogue } from "@/marketplace/data";
import { DatasheetUpload } from "@/supplier/DatasheetUpload";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Start from a datasheet (step 8.4): pick the category and upload the PDF; the worker reads it.
export const metadata: Metadata = { title: "Start from a datasheet · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DatasheetStartPage() {
  const page = await requireSupplier("/supplier/products/datasheet");
  const cat = await catalogue();
  const categories = cat.classes.flatMap((c) =>
    c.categories.flatMap((k) => [
      ...(k.children.length ? [] : [{ id: k.id, label: `${c.label} › ${k.label}` }]),
      ...k.children.map((s) => ({ id: s.id, label: `${c.label} › ${k.label} › ${s.label}` })),
    ]),
  );
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <Link href="/supplier/products/new" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Add a product
      </Link>
      <div>
        <h1 className="type-h2">Start from a datasheet</h1>
        <p className="type-body-sm text-secondary">
          We read the datasheet and fill in a draft for you to check. Nothing shows to buyers until H2 India approves
          it.
        </p>
      </div>
      <DatasheetUpload organisationId={page.supplier.organisationId} categories={categories} />
    </SupplierShell>
  );
}
