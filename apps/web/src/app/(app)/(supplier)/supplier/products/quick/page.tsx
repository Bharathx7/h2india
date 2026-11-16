import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { quickStockRows } from "@h2india/core/products";
import { EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { QuickStock, type QuickRow } from "@/supplier/QuickStock";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Quick stock and price (722:12379), step 8.5: fixed-price products; changes go live at once.
export const metadata: Metadata = { title: "Quick stock and price · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function QuickStockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/products/quick");
  const all = await quickStockRows(getDb(), scopeFor(page.actor), page.supplier.organisationId);
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows: QuickRow[] = all
    .filter((r) => !q || [r.name, r.model, r.sku].join(" ").toLowerCase().includes(q))
    .map((r) => ({
      id: r.id,
      name: r.name,
      model: r.model,
      sku: r.sku,
      price: r.pricePaise ? String(Number(r.pricePaise) / 100) : "",
      stockQty: r.stockQty === null ? "0" : String(r.stockQty),
      shipDays: r.shipDays === null ? "" : String(r.shipDays),
      gstBps: r.gstRateBps ?? 0,
    }));
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <Link href="/supplier/products" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Products
      </Link>
      <div>
        <h1 className="type-h2">Quick stock &amp; price</h1>
        <p className="type-body-sm text-secondary">
          Fixed-price products only. Price, stock and lead time go live as soon as you save, and they don&apos;t go back
          to review.
        </p>
      </div>
      <form method="get">
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search product name or SKU"
          placeholder="Search product name or SKU"
          className="h-11 w-full max-w-xl rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        />
      </form>
      {rows.length ? (
        <QuickStock rows={rows} total={all.length} />
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title={q ? "No product matches" : "No fixed-price products"}>
            Quote-only products have no price to edit. Set a fixed price in a product&apos;s editor to manage it here.
          </EmptyState>
        </div>
      )}
    </SupplierShell>
  );
}
