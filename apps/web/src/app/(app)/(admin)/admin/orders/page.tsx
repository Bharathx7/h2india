import { getDb, Money } from "@h2india/core";
import {
  adminOrderCounts,
  adminOrders,
  ORDER_BADGE_TONE,
  type AdminOrderView,
  type OrderStatus,
} from "@h2india/core/orders";
import { formatIstDate } from "@h2india/core/time";
import { cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { requireTransactionsPage } from "@/orders/guard";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Admin Orders (step 11.5): orders needing Operations (a supplier late to answer, a locked delivery link, a dispute),
// disputes, and every order. Built from the design system while Figma is out of reach (A178).
export const metadata: Metadata = { title: "Orders · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: { key: AdminOrderView; label: string }[] = [
  { key: "attention", label: "Needs attention" },
  { key: "disputes", label: "Disputes" },
  { key: "all", label: "All orders" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string; perPage?: string }>;
}) {
  requireTransactionsPage();
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("orders.view", "/admin/orders");
  const view = TABS.find((t) => t.key === sp.view)?.key ?? "attention";
  const db = getDb();
  const [rows, counts] = await Promise.all([adminOrders(db, actor, { view, q: sp.q }), adminOrderCounts(db, actor)]);
  // adminOrders loads at most 200 rows; this pages through what it loaded.
  const paged = pageOf(rows, pageRequest(sp));
  return (
    <AdminShell userId={userId} current="/admin/orders" title="Orders">
      <div className="flex flex-col gap-1">
        <h1 className="type-h2">Orders</h1>
        <p className="type-body text-body">
          Late answers, locked delivery links and disputes come here for Operations.
        </p>
      </div>
      <nav aria-label="Order views" className="flex gap-6 border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/orders?view=${t.key}`}
            aria-current={t.key === view ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label",
              t.key === view ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>
      <form method="get" className="flex gap-3">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search by order number"
          placeholder="Search by order number"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
      </form>
      {rows.length ? (
        <div className="flex flex-col gap-4">
          <div
            tabIndex={0}
            role="region"
            aria-label="Orders"
            className="relative overflow-x-auto rounded-card border border-default bg-page"
          >
            <table className="w-full min-w-[900px] type-body-sm">
              <thead>
                <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
                  {["Order", "Placed", "Buyer", "Supplier", "Total", "Status", "Dispute"].map((h, i) => (
                    <th key={h} scope="col" className={i === 0 ? "px-4 py-2.5" : "py-2.5 pr-3"}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((r) => (
                  <tr key={r.id} className="border-b border-default last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${r.id}`} className="type-spec hover:underline">
                        {r.reference}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">{formatIstDate(r.createdAt)}</td>
                    <td className="py-3 pr-3">{r.buyer}</td>
                    <td className="py-3 pr-3">{r.supplier}</td>
                    <td className="py-3 pr-3 type-spec">{Money.format(r.totalPaise)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={r.status} tone={ORDER_BADGE_TONE[r.status as OrderStatus]} />
                    </td>
                    <td className="py-3 pr-3">{r.dispute ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPager paged={paged} query={pagingQuery(sp)} />
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title={view === "attention" ? "Nothing needs attention" : "No orders here"}>
            {view === "attention"
              ? "Late answers, locked links and disputes appear here."
              : "Orders appear as buyers place them."}
          </EmptyState>
        </div>
      )}
    </AdminShell>
  );
}
