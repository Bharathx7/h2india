import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { buyerPayments, buyerRefunds } from "@h2india/core/orders";
import { formatIstDate } from "@h2india/core/time";
import { cx, EmptyState, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { requireTransactionsPage } from "@/orders/guard";

// Payments and invoices (720:8): Payments (720:281) and Refunds (720:881), step 10.8. GST invoices are on each order's
// page under Documents. Built without its frames (A178).
export const metadata: Metadata = { title: "Payments · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  online: "Online",
};
const TONE: Record<string, "success" | "progress" | "error" | "warning"> = {
  Succeeded: "success",
  Refunded: "success",
  Pending: "progress",
  Processing: "progress",
  Failed: "error",
  "Timed out": "warning",
};

export default async function BuyerPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; state?: string }>;
}) {
  requireTransactionsPage();
  const sp = await searchParams;
  const page = await requireBuyer("/buyer/payments");
  if (!page.buyer.seat.permissions.has("money.view") && !page.buyer.seat.permissions.has("order.place")) {
    return (
      <BuyerWorkspace page={page} current="/buyer/payments">
        <EmptyState title="Your role can't see payments">Ask your company admin for access.</EmptyState>
      </BuyerWorkspace>
    );
  }
  const tab = sp.tab === "refunds" ? "refunds" : "payments";
  const db = getDb();
  const scope = scopeFor(page.actor);
  const [payments, refunds] = await Promise.all([
    buyerPayments(scope, db, page.buyer.organisationId),
    buyerRefunds(scope, db, page.buyer.organisationId),
  ]);
  const rows = tab === "payments" ? payments.length : refunds.length;
  return (
    <BuyerWorkspace page={page} current="/buyer/payments">
      <div className="flex flex-col gap-1">
        <h1 className="type-h2">Payments and invoices</h1>
        <p className="type-body text-body">
          Every payment into your orders&apos; escrow accounts, and every refund. GST invoices are on each order.
        </p>
      </div>
      <nav aria-label="Payments tabs" className="flex gap-6 border-b border-default">
        {(
          [
            ["payments", `Payments`, payments.length],
            ["refunds", "Refunds", refunds.length],
          ] as const
        ).map(([key, label, n]) => (
          <Link
            key={key}
            href={`/buyer/payments?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label",
              tab === key ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {label} <span className="text-secondary">{n}</span>
          </Link>
        ))}
      </nav>
      <LiveSection
        label={tab === "payments" ? "Payments" : "Refunds"}
        state={forcedState(sp.state) ?? (rows ? "ready" : "empty")}
        errorTitle="Payments didn't load"
        skeleton={
          <div className="flex flex-col gap-2 rounded-card border border-default bg-page p-6">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState title={tab === "payments" ? "No payments yet" : "No refunds"}>
              {tab === "payments"
                ? "Payments appear here once the payment partner confirms them."
                : "If an order is cancelled or a problem is settled with a refund, it shows here."}
            </EmptyState>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="region"
          aria-label={tab}
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
                <th scope="col" className="px-4 py-2.5">
                  {tab === "payments" ? "Date" : "Refund"}
                </th>
                <th scope="col" className="py-2.5">
                  Order
                </th>
                <th scope="col" className="py-2.5">
                  {tab === "payments" ? "Supplier" : "Reason"}
                </th>
                <th scope="col" className="py-2.5">
                  {tab === "payments" ? "Method" : "Date"}
                </th>
                <th scope="col" className="py-2.5">
                  Amount
                </th>
                <th scope="col" className="py-2.5 pr-4">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {tab === "payments"
                ? payments.map((p) => (
                    <tr key={p.id} className="border-b border-default last:border-b-0 type-body-sm">
                      <td className="px-4 py-3">{formatIstDate(p.confirmedAt ?? p.at)}</td>
                      <td className="py-3">
                        <Link href={`/buyer/orders/${p.orderId}`} className="type-spec hover:underline">
                          {p.reference}
                        </Link>
                      </td>
                      <td className="py-3">{p.supplier}</td>
                      <td className="py-3">{METHOD[p.method] ?? p.method}</td>
                      <td className="py-3 type-spec">{Money.format(p.amountPaise)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          status={p.status === "Succeeded" ? "Paid" : p.status}
                          tone={TONE[p.status] ?? "neutral"}
                        />
                      </td>
                    </tr>
                  ))
                : refunds.map(({ refund: r, orderId, orderRef }) => (
                    <tr key={r.id} className="border-b border-default last:border-b-0 type-body-sm">
                      <td className="px-4 py-3 type-spec">{r.reference}</td>
                      <td className="py-3">
                        <Link href={`/buyer/orders/${orderId}`} className="type-spec hover:underline">
                          {orderRef}
                        </Link>
                      </td>
                      <td className="py-3">{r.reason}</td>
                      <td className="py-3">{formatIstDate(r.confirmedAt ?? r.createdAt)}</td>
                      <td className="py-3 type-spec">{Money.format(r.amountPaise)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={r.status} tone={TONE[r.status] ?? "neutral"} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </LiveSection>
    </BuyerWorkspace>
  );
}
