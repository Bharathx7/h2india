import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { PRODUCT_TABS, stockLine, supplierProducts } from "@h2india/core/products";
import { buttonClasses, cx, EmptyState, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { catalogue } from "@/marketplace/data";
import { ProductsTable, type ProductLine } from "@/supplier/ProductsTable";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Products (598:8; phones 599:8; states 600:8), step 8.3: the supplier's listings by status, with search, category,
// bulk pause and archive. Views and enquiries arrive with analytics (8.8). Prices show here: this is the supplier's own
// catalogue, not a public listing.
export const metadata: Metadata = { title: "Products · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    category?: string;
    state?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/products");
  const s = page.supplier;
  const [{ items, counts }, cat] = await Promise.all([
    supplierProducts(getDb(), scopeFor(page.actor), s.organisationId, {
      tab: sp.tab,
      q: sp.q?.trim(),
      categoryId: sp.category || undefined,
    }),
    catalogue(),
  ]);
  const tab = PRODUCT_TABS.find((t) => t.key === sp.tab) ?? PRODUCT_TABS[0];
  const canEdit = s.seat.permissions.has("product.manage");
  const rows: ProductLine[] = items.map((p) => {
    const stock = stockLine(p);
    const pricing =
      p.pricing === "fixed" && p.pricePaise
        ? { pricing: rupees(p.pricePaise), pricingSub: "Fixed price" }
        : p.pricing === "indicative" && p.indicativeMinPaise && p.indicativeMaxPaise
          ? {
              pricing: `${rupees(p.indicativeMinPaise)}–${rupees(p.indicativeMaxPaise)}`,
              pricingSub: "Indicative range",
            }
          : { pricing: "Quote only", pricingSub: "" };
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      model: p.model,
      category: p.category,
      ...pricing,
      stock: stock.line,
      stockSub: stock.sub,
      status: p.shown,
    };
  });
  const categories = cat.classes.flatMap((c) =>
    c.categories.map((k) => ({ id: k.id, label: `${c.label} › ${k.label}` })),
  );
  const paged = pageOf(rows, pageRequest(sp));
  const searching = Boolean(sp.q?.trim() || sp.category);
  const total = counts.all ?? 0;
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Products</h1>
          <p className="type-body-sm text-secondary">
            Everything {s.tradeName} lists. Spec, certificate or category changes go back to review; price, stock and
            lead time go live at once.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/supplier/products/new" className={buttonClasses({})}>
              <Icon name="plus" size={18} />
              Add product
            </Link>
            <Link href="/supplier/products/datasheet" className={buttonClasses({ variant: "outline" })}>
              <Icon name="file-text" size={18} />
              From a datasheet
            </Link>
            {/* Founder QC (17 Nov 2026): asking for a missing category was only reachable from Add a product. */}
            <Link href="/supplier/products/categories" className={buttonClasses({ variant: "ghost" })}>
              <Icon name="folder" size={18} />
              Request a category
            </Link>
            <Link href="/supplier/products/import" className={buttonClasses({ variant: "outline" })}>
              <Icon name="upload" size={18} />
              Bulk upload
            </Link>
            <Link href="/supplier/products/quick" className={buttonClasses({ variant: "outline" })}>
              <Icon name="sliders" size={18} />
              Quick stock &amp; price
            </Link>
          </div>
        ) : null}
      </div>
      <nav aria-label="Product status" className="flex gap-5 overflow-x-auto border-b border-default">
        {PRODUCT_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/supplier/products?tab=${t.key}`}
            aria-current={tab.key === t.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label whitespace-nowrap",
              tab.key === t.key ? "border-inverse text-primary" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{counts[t.key] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap gap-3">
        <input type="hidden" name="tab" value={tab.key} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search by name or model"
          placeholder="Search by name or model"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
        <select
          name="category"
          defaultValue={sp.category ?? ""}
          aria-label="Category"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Search
        </button>
      </form>
      <LiveSection
        label="Products"
        state={forcedState(sp.state) ?? (rows.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} kind="table-row" />
            ))}
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            {total === 0 && !searching ? (
              <EmptyState
                title="Add your first product"
                action={
                  canEdit ? (
                    <Link href="/supplier/products/new" className={buttonClasses({})}>
                      Add product
                    </Link>
                  ) : undefined
                }
              >
                Add it by hand, upload a datasheet and we&apos;ll draft it for you, or use a CSV template for many at
                once.
              </EmptyState>
            ) : searching ? (
              <EmptyState title="No products match">Try another name, model or category.</EmptyState>
            ) : (
              <EmptyState title={`No ${tab.label.toLowerCase()} products`}>
                Products show here when they reach this status.
              </EmptyState>
            )}
          </div>
        }
      >
        {/* Keyed by page so a selection never carries over to rows that aren't shown. */}
        <ProductsTable
          key={`${String(paged.page)}-${String(paged.perPage)}`}
          rows={paged.rows}
          canEdit={canEdit}
          company={s.tradeName}
        />
        <ListPager paged={paged} query={pagingQuery(sp)} className="mt-4" />
      </LiveSection>
    </SupplierShell>
  );
}
