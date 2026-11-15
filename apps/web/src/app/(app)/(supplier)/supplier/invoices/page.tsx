import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { rateCardFor, supplierMonths, supplierPayouts, supplierSettlements } from "@h2india/core/orders";
import { formatIstDate } from "@h2india/core/time";
import { Alert, cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireTransactionsPage } from "@/orders/guard";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Fees and invoices (365:34452), step 10.11: Overview (816:12052; phones 822:14186), Orders and fees (816:12500),
// Payouts (816:13000), Fee invoices (817:13047, 817:13414), Tax credits (822:13176) and Statements (822:13666). The
// rate card's figures are samples until the CA signs them (M11). Built without its frames (A178).
export const metadata: Metadata = { title: "Fees and invoices · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders and fees" },
  { key: "payouts", label: "Payouts" },
  { key: "invoices", label: "Fee invoices" },
  { key: "tax", label: "Tax credits" },
  { key: "statements", label: "Statements" },
] as const;

const rupees = (p: bigint) => Money.format(p);
const monthName = (m: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${m}-01T00:00:00Z`),
  );

function Table({ label, head, children }: { label: string; head: string[]; children: ReactNode }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="relative overflow-x-auto rounded-card border border-default bg-page"
    >
      <table className="w-full min-w-[820px]">
        <thead>
          <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
            {head.map((h, i) => (
              <th key={h} scope="col" className={i === 0 ? "px-4 py-2.5" : "py-2.5 pr-3"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="type-body-sm">{children}</tbody>
      </table>
    </div>
  );
}

export default async function FeesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  requireTransactionsPage();
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/invoices");
  const s = page.supplier;
  if (!s.seat.permissions.has("money.view")) {
    return (
      <SupplierShell page={page} current="/supplier/invoices" title="Fees & invoices">
        <EmptyState title="Your role can't see fees and payouts">Ask your company admin for access.</EmptyState>
      </SupplierShell>
    );
  }
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "overview";
  const db = getDb();
  const scope = scopeFor(page.actor);
  const [settlements, payouts, months, card] = await Promise.all([
    supplierSettlements(scope, db, s.organisationId),
    supplierPayouts(scope, db, s.organisationId),
    supplierMonths(scope, db, s.organisationId),
    rateCardFor(db, new Date()),
  ]);
  const upcoming = settlements.filter((x) => !x.settlement.payoutId);
  const nextRun = upcoming.map((x) => x.settlement.payoutDueAt).sort((a, b) => a.getTime() - b.getTime())[0];
  const thisMonth = months[0];
  return (
    <SupplierShell page={page} current="/supplier/invoices" title="Fees & invoices">
      <div className="flex flex-col gap-1">
        <h1 className="type-h2">Fees and invoices</h1>
        <p className="type-body text-body">
          What you&apos;re paid for each order, H2 India&apos;s fee, and the TCS and TDS deducted for you to claim.
        </p>
      </div>
      {card.sample ? (
        <Alert
          tone="info"
          title={`Rate card ${card.version} · ${String(card.feeBps / 100)}% of the order value before GST`}
        >
          {card.feeCapPaise ? `Capped at ${rupees(BigInt(card.feeCapPaise))} per order, plus GST on the fee. ` : ""}
          These figures are being confirmed before launch.
        </Alert>
      ) : null}
      <nav aria-label="Fees tabs" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/supplier/invoices?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              [
                "Next payout",
                upcoming.length ? rupees(upcoming.reduce((t, x) => t + x.settlement.netPaise, 0n)) : "Nothing due",
                nextRun
                  ? `In the run on ${formatIstDate(nextRun)}`
                  : "Payouts run at 11:00 and 16:00 IST on working days",
              ],
              ["Paid out this month", rupees(thisMonth?.net ?? 0n), `${String(thisMonth?.orders ?? 0)} orders`],
              [
                "Fees this month",
                rupees((thisMonth?.fee ?? 0n) + (thisMonth?.gstOnFee ?? 0n)),
                "Including GST on the fee",
              ],
            ] as [string, string, string][]
          ).map(([k, v, note]) => (
            <section key={k} className="flex flex-col gap-1 rounded-card border border-default bg-page p-5">
              <p className="type-caption text-secondary">{k}</p>
              <p className="type-h3">{v}</p>
              <p className="type-caption text-secondary">{note}</p>
            </section>
          ))}
        </div>
      ) : null}

      {tab === "orders" ? (
        settlements.length ? (
          <Table
            label="Orders and fees"
            head={["Order", "Buyer", "Released", "Fee + GST", "TCS", "TDS", "You receive", "Payout"]}
          >
            {settlements.map(({ settlement: x, reference, orderId, buyer, payoutRef, payoutStatus }) => (
              <tr key={x.id} className="border-b border-default last:border-b-0">
                <td className="px-4 py-3">
                  <Link href={`/supplier/orders/${orderId}`} className="type-spec hover:underline">
                    {reference}
                  </Link>
                </td>
                <td className="py-3 pr-3">{buyer}</td>
                <td className="py-3 pr-3 type-spec">{rupees(x.releasedPaise)}</td>
                <td className="py-3 pr-3 type-spec">
                  {x.launchOffer ? "₹0 · launch offer" : rupees(x.feePaise + x.gstOnFeePaise)}
                </td>
                <td className="py-3 pr-3 type-spec">{rupees(x.tcsPaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(x.tdsPaise)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(x.netPaise)}</td>
                <td className="py-3 pr-3">
                  {payoutRef ? (
                    <StatusBadge
                      status={`${payoutRef} · ${payoutStatus ?? ""}`}
                      tone={payoutStatus === "Paid" ? "success" : "progress"}
                    />
                  ) : (
                    <span className="text-secondary">{formatIstDate(x.payoutDueAt)}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No releases yet">
            When a buyer accepts a delivery, the order&apos;s release shows here.
          </EmptyState>
        )
      ) : null}

      {tab === "payouts" ? (
        payouts.length ? (
          <Table label="Payouts" head={["Payout", "Run", "Amount", "UTR", "Status"]}>
            {payouts.map((p) => (
              <tr key={p.id} className="border-b border-default last:border-b-0">
                <td className="px-4 py-3">
                  <Link href={`/supplier/invoices/payouts/${p.id}`} className="type-spec hover:underline">
                    {p.reference}
                  </Link>
                </td>
                <td className="py-3 pr-3">{formatIstDate(p.runAt)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(p.amountPaise)}</td>
                <td className="py-3 pr-3 type-spec">{p.utr ?? "—"}</td>
                <td className="py-3 pr-3">
                  <StatusBadge
                    status={p.status}
                    tone={p.status === "Paid" ? "success" : p.status === "Failed" ? "error" : "progress"}
                  />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No payouts yet">
            Payouts go to your payout bank account at 11:00 and 16:00 IST on working days.
          </EmptyState>
        )
      ) : null}

      {tab === "invoices" ? (
        months.length ? (
          <Table label="Fee invoices" head={["Month", "Orders", "Fee", "GST on fee", "Invoice"]}>
            {months.map((m) => (
              <tr key={m.month} className="border-b border-default last:border-b-0">
                <td className="px-4 py-3">{monthName(m.month)}</td>
                <td className="py-3 pr-3">{m.orders}</td>
                <td className="py-3 pr-3 type-spec">{rupees(m.fee)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(m.gstOnFee)}</td>
                <td className="py-3 pr-3 text-secondary">
                  {m.fee === 0n ? "No fee this month" : "Issued once the invoice format is confirmed"}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No fee invoices yet">H2 India invoices its fee once a month.</EmptyState>
        )
      ) : null}

      {tab === "tax" ? (
        months.length ? (
          <Table label="Tax credits" head={["Month", "Released", "TCS deducted", "TDS deducted"]}>
            {months.map((m) => (
              <tr key={m.month} className="border-b border-default last:border-b-0">
                <td className="px-4 py-3">{monthName(m.month)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(m.released)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(m.tcs)}</td>
                <td className="py-3 pr-3 type-spec">{rupees(m.tds)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No deductions yet">
            TCS and TDS deducted from your payouts are listed here by month.
          </EmptyState>
        )
      ) : null}

      {tab === "statements" ? (
        months.length ? (
          <ul className="flex flex-col gap-2">
            {months.map((m) => (
              <li
                key={m.month}
                className="flex items-center gap-3 rounded-card border border-default bg-page px-5 py-4"
              >
                <span className="flex-1 type-label">{monthName(m.month)}</span>
                <span className="type-spec">{rupees(m.net)}</span>
                <Link
                  href={`/supplier/invoices/statement?month=${m.month}`}
                  prefetch={false}
                  className="type-label text-link underline"
                >
                  Download CSV
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No statements yet">A statement is ready for each month with a release.</EmptyState>
        )
      ) : null}
    </SupplierShell>
  );
}
