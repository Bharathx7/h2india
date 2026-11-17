import { getDb } from "@h2india/core";
import { listAllProducts, PRODUCT_LIST_STATUSES } from "@h2india/core/admin/lists";
import { can } from "@h2india/core/authz";
import { formatIstDate } from "@h2india/core/time";
import { Icon, StatusBadge, type BadgeTone } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters, ListTable } from "@/admin/ListTable";
import { ListingStatus } from "@/admin/lists/ListingStatus";
import { AdminShell, requireOperator } from "@/admin/shell";
import { pageRequest, pageWindow, pagingQuery } from "@/lib/paging";
import { absolute } from "@/seo/site";

// All products (founder QC, 17 Nov 2026): every listing, whatever its status, searched by name, model or supplier and
// paged in the database. Operators pause, resume or take down a listing with a reason; review still happens in
// Queues · Listings.
export const metadata: Metadata = { title: "All products · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TONE: Record<string, BadgeTone> = {
  Live: "success",
  Paused: "warning",
  "In review": "progress",
  "Needs changes": "warning",
  Rejected: "error",
  Archived: "neutral",
  Draft: "neutral",
};

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("queues.view", "/admin/listings");
  const status = (PRODUCT_LIST_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;
  const req = pageRequest(sp);
  const { rows, total } = await listAllProducts(getDb(), actor, { q, status, ...pageWindow(req) });
  const canEdit = can(actor, "queues.edit");
  return (
    <AdminShell userId={userId} current="/admin/queues">
      <Link href="/admin/queues/listings" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Queues
      </Link>
      <div>
        <h1 className="type-h2">All products</h1>
        <p className="type-body text-secondary">
          Every listing on H2 Economy. Listings waiting for review are decided in Queues · Listings.
        </p>
      </div>
      <ListFilters
        placeholder="Search product, model or supplier"
        q={sp.q}
        selects={[
          {
            name: "status",
            label: "Status",
            value: status ?? "",
            options: [
              { value: "", label: "Any status" },
              ...PRODUCT_LIST_STATUSES.map((s) => ({ value: s, label: s })),
            ],
          },
        ]}
      />
      <ListTable
        label="All products"
        headings={["Product", "Supplier", "Category", "Status", "Updated", ""]}
        paged={{ page: req.page, perPage: req.perPage, total }}
        query={pagingQuery(sp)}
        clearHref="/admin/listings"
        filtered={Boolean(q ?? status)}
        emptyTitle="No products yet"
        emptyText="Listings appear here as suppliers add them."
      >
        {rows.map((p) => (
          <tr key={p.id} className="border-t border-default align-top">
            <td className="px-4 py-3">
              {p.status === "Live" ? (
                // The product page is on the public site; the admin domain serves no marketplace pages.
                <a
                  href={absolute(`/marketplace/products/${p.slug}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="block type-label text-link underline"
                >
                  {p.name}
                  <span className="sr-only"> (opens the public site)</span>
                </a>
              ) : (
                <span className="block type-label">{p.name}</span>
              )}
              <span className="block type-caption text-secondary">
                {[p.model, p.sample ? "sample" : null].filter(Boolean).join(" · ")}
              </span>
            </td>
            <td className="px-2 py-3 type-body-sm">
              <Link href={`/admin/users/companies/${p.organisationId}`} className="text-link underline">
                {p.supplier}
              </Link>
            </td>
            <td className="px-2 py-3 type-body-sm">{p.category}</td>
            <td className="px-2 py-3">
              <StatusBadge status={p.status} tone={TONE[p.status] ?? "neutral"} />
            </td>
            <td className="px-2 py-3 type-body-sm">{formatIstDate(p.updatedAt)}</td>
            <td className="px-4 py-3 text-right">
              {canEdit ? <ListingStatus id={p.id} name={p.name} status={p.status} /> : null}
            </td>
          </tr>
        ))}
      </ListTable>
    </AdminShell>
  );
}
