import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { BUYER_ORDER_TABS, listOrders } from "@h2india/core/orders";
import { formatIstDate } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { requireTransactionsPage } from "@/orders/guard";
import { buyerNextStep } from "@/orders/views";

// My orders (77:673; phones 81:8334; states 128:9187 empty, 128:9220 loading, 128:9259 error), step 10.1. Built
// from the supplier pipeline's patterns while Figma is out of reach (A178).
export const metadata: Metadata = { title: "Orders · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; state?: string }>;
}) {
  requireTransactionsPage();
  const sp = await searchParams;
  const page = await requireBuyer("/buyer/orders");
  const all = await listOrders(scopeFor(page.actor), getDb(), {
    organisationId: page.buyer.organisationId,
    side: "buyer",
  });
  const now = new Date();
  const tab = BUYER_ORDER_TABS.find((t) => t.key === sp.tab) ?? BUYER_ORDER_TABS[0];
  const shown = all.filter((o) => (tab.statuses as readonly string[]).includes(o.status));
  const count = (k: (typeof BUYER_ORDER_TABS)[number]) =>
    all.filter((o) => (k.statuses as readonly string[]).includes(o.status)).length;
  return (
    <BuyerWorkspace page={page} current="/buyer/orders">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="type-h2">Orders</h1>
          <p className="type-body text-body">
            Everything your company has ordered. Payments are held until you accept each delivery.
          </p>
        </div>
        <Link href="/marketplace" className={buttonClasses({ variant: "outline" })}>
          Browse the marketplace
        </Link>
      </div>
      <nav aria-label="Order tabs" className="flex gap-6 overflow-x-auto border-b border-default">
        {BUYER_ORDER_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/buyer/orders?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab.key ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{count(t)}</span>
          </Link>
        ))}
      </nav>
      <LiveSection
        label="Orders"
        state={forcedState(sp.state) ?? (shown.length ? "ready" : "empty")}
        errorTitle="Orders didn't load"
        errorText="Check your connection and try again. Your orders and payments are safe."
        skeleton={
          <div className="flex flex-col gap-2.5 rounded-card border border-default bg-page p-6">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState
              title={all.length ? "Nothing in this tab" : "No orders yet"}
              action={
                all.length ? undefined : (
                  <Link href="/rfq/new" className={buttonClasses({})}>
                    Request a quote
                  </Link>
                )
              }
            >
              {all.length
                ? "Orders move between tabs as they progress."
                : "Accept a quote or buy a fixed-price product, and the order appears here."}
            </EmptyState>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="region"
          aria-label="Orders"
          className="relative overflow-x-auto rounded-card border border-default bg-page max-md:hidden"
        >
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
                <th scope="col" className="px-4 py-2.5">
                  Order
                </th>
                <th scope="col" className="py-2.5">
                  Supplier
                </th>
                <th scope="col" className="py-2.5">
                  Items
                </th>
                <th scope="col" className="py-2.5">
                  Total incl. GST
                </th>
                <th scope="col" className="py-2.5">
                  Status
                </th>
                <th scope="col" className="py-2.5 pr-4">
                  Next step
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => {
                const next = buyerNextStep(o, now);
                return (
                  <tr key={o.id} className="border-b border-default last:border-b-0">
                    <td className="px-4 py-3.5">
                      <Link href={`/buyer/orders/${o.id}`} className="type-spec hover:underline">
                        {o.reference}
                      </Link>
                      <span className="block type-caption text-secondary">{formatIstDate(o.createdAt)}</span>
                    </td>
                    <td className="py-3.5 pr-2 type-body-sm">{o.supplierName}</td>
                    <td className="py-3.5 pr-2 type-body-sm">{o.itemSummary}</td>
                    <td className="py-3.5 type-spec">{Money.format(o.totalPaise)}</td>
                    <td className="py-3.5">
                      <StatusBadge status={o.badge.label} tone={o.badge.tone} />
                    </td>
                    <td className={cx("py-3.5 pr-4 type-body-sm", next.urgent && "text-error")}>{next.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-col gap-3 md:hidden">
          {shown.map((o) => {
            const next = buyerNextStep(o, now);
            return (
              <li key={o.id}>
                <Link
                  href={`/buyer/orders/${o.id}`}
                  className="flex flex-col gap-2 rounded-card border border-default bg-page p-4"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="type-spec">{o.reference}</span>
                    <StatusBadge status={o.badge.label} tone={o.badge.tone} />
                  </span>
                  <span className="type-label">
                    {o.supplierName} · {Money.format(o.totalPaise)}
                  </span>
                  <span className="type-body-sm text-body">{o.itemSummary}</span>
                  <span className={cx("type-caption", next.urgent ? "text-error" : "text-secondary")}>{next.text}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </LiveSection>
    </BuyerWorkspace>
  );
}
