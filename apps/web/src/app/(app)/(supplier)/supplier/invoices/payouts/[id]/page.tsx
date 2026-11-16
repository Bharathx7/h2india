import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { supplierPayout } from "@h2india/core/orders";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTransactionsPage } from "@/orders/guard";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Payout detail (817:12613), step 10.11: the orders it paid, with the fee, TCS and TDS each. Built without its
// frame (A178).
export const metadata: Metadata = { title: "Payout · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);

export default async function PayoutPage({ params }: { params: Promise<{ id: string }> }) {
  requireTransactionsPage();
  const { id } = await params;
  const page = await requireSupplier(`/supplier/invoices/payouts/${id}`);
  if (!page.supplier.seat.permissions.has("money.view")) notFound();
  const p = await supplierPayout(scopeFor(page.actor), getDb(), page.supplier.organisationId, id);
  if (!p) notFound();
  const sum = (k: "releasedPaise" | "feePaise" | "gstOnFeePaise" | "tcsPaise" | "tdsPaise" | "netPaise") =>
    p.lines.reduce((t, l) => t + l.settlement[k], 0n);
  return (
    <SupplierShell page={page} current="/supplier/invoices" title="Fees & invoices">
      <Link href="/supplier/invoices?tab=payouts" className="inline-flex items-center gap-2 self-start type-label">
        <Icon name="arrow-left" size={16} />
        Payouts
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">Payout {p.payout.reference}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge
            status={p.payout.status}
            tone={p.payout.status === "Paid" ? "success" : p.payout.status === "Failed" ? "error" : "progress"}
          />
          {p.payout.paidAt ? `Paid ${formatIstDateTime(p.payout.paidAt)}` : `Run ${formatIstDate(p.payout.runAt)}`}
          {p.account ? ` · to the account ending ${p.account.last4}` : ""}
          {p.payout.utr ? ` · UTR ${p.payout.utr}` : ""}
        </p>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label="Orders in this payout"
        className="relative overflow-x-auto rounded-card border border-default bg-page"
      >
        <table className="w-full min-w-[760px] type-body-sm">
          <thead>
            <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
              {["Order", "Released", "Fee", "GST on fee", "TCS", "TDS", "You receive"].map((h, i) => (
                <th key={h} scope="col" className={i === 0 ? "px-4 py-2.5" : "py-2.5 pr-3"}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.lines.map((l) => (
              <tr key={l.settlement.id} className="border-b border-default">
                <td className="px-4 py-3">
                  <Link href={`/supplier/orders/${l.orderId}`} className="type-spec hover:underline">
                    {l.reference}
                  </Link>
                </td>
                <td className="py-3 pr-3 type-spec">{rupees(l.settlement.releasedPaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(l.settlement.feePaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(l.settlement.gstOnFeePaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(l.settlement.tcsPaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(l.settlement.tdsPaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(l.settlement.netPaise)}</td>
              </tr>
            ))}
            <tr className="type-label">
              <td className="px-4 py-3">Total</td>
              <td className="py-3 pr-3 type-spec">{rupees(sum("releasedPaise"))}</td>
              <td className="py-3 pr-3 type-spec">{rupees(sum("feePaise"))}</td>
              <td className="py-3 pr-3 type-spec">{rupees(sum("gstOnFeePaise"))}</td>
              <td className="py-3 pr-3 type-spec">{rupees(sum("tcsPaise"))}</td>
              <td className="py-3 pr-3 type-spec">{rupees(sum("tdsPaise"))}</td>
              <td className="py-3 pr-3 type-spec">{rupees(sum("netPaise"))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SupplierShell>
  );
}
