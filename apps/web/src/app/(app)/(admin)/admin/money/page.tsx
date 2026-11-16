import { getDb, Money } from "@h2india/core";
import { adminPayments, adminPayouts, ledgerMonths, moneySettings, reconciliationIssues } from "@h2india/core/orders";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ResolveIssue } from "@/admin/orders/Controls";
import { AdminShell, requireOperator } from "@/admin/shell";
import { requireTransactionsPage } from "@/orders/guard";

// Admin Money (step 11.6): payments, payouts, the ledger and reconciliation (705:8: collected = paid out + fees + GST
// on fees + TCS + TDS + held), and the rate card and pilot list. Built from the design system (A178). Read with
// money.view; resolving a difference needs money.edit.
export const metadata: Metadata = { title: "Money · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "ledger", label: "Ledger and reconciliation" },
  { key: "payments", label: "Payments" },
  { key: "payouts", label: "Payouts" },
  { key: "rates", label: "Rate card and pilot" },
] as const;

const rupees = (p: bigint) => Money.format(p);

function Table({ label, head, children }: { label: string; head: string[]; children: ReactNode }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="relative overflow-x-auto rounded-card border border-default bg-page"
    >
      <table className="w-full min-w-[860px] type-body-sm">
        <thead>
          <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
            {head.map((h, i) => (
              <th key={h} scope="col" className={i === 0 ? "px-4 py-2.5" : "py-2.5 pr-3"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default async function AdminMoneyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  requireTransactionsPage();
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("money.view", "/admin/money");
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "ledger";
  const db = getDb();
  const canEdit = actor.operator.has("money.edit");
  return (
    <AdminShell userId={userId} current="/admin/money" title="Money">
      <div className="flex flex-col gap-1">
        <h1 className="type-h2">Money</h1>
        <p className="type-body text-body">
          Every rupee through the payment partner, the ledger that records it, and payouts.
        </p>
      </div>
      <nav aria-label="Money tabs" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/money?tab=${t.key}`}
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
      {tab === "ledger" ? await Ledger() : null}
      {tab === "payments" ? await Payments() : null}
      {tab === "payouts" ? await Payouts() : null}
      {tab === "rates" ? await Rates() : null}
    </AdminShell>
  );

  async function Ledger() {
    const [months, issues] = await Promise.all([ledgerMonths(db, actor), reconciliationIssues(db, actor)]);
    return (
      <>
        <Table
          label="Monthly identity"
          head={[
            "Month",
            "Collected",
            "Paid out",
            "Refunded",
            "Fees + GST",
            "TCS",
            "TDS",
            "Held",
            "Owed",
            "Difference",
          ]}
        >
          {months.map((m) => (
            <tr key={m.month} className="border-b border-default last:border-b-0">
              <td className="px-4 py-3">{m.month}</td>
              {[m.collected, m.paidOut, m.refunded, m.fees + m.gstOnFees, m.tcs, m.tds, m.held, m.owed].map((v, i) => (
                <td key={i} className="py-3 pr-3 type-spec">
                  {rupees(v)}
                </td>
              ))}
              <td className="py-3 pr-3">
                <StatusBadge
                  status={m.difference === 0n ? "Balanced" : rupees(m.difference)}
                  tone={m.difference === 0n ? "success" : "error"}
                />
              </td>
            </tr>
          ))}
        </Table>
        <h2 className="type-h3">Differences to resolve</h2>
        {issues.length ? (
          <Table label="Reconciliation differences" head={["Found", "Kind", "What", "Partner reference", "Resolve"]}>
            {issues.map((i) => (
              <tr key={i.id} className="border-b border-default last:border-b-0 align-top">
                <td className="px-4 py-3">{formatIstDateTime(i.createdAt)}</td>
                <td className="py-3 pr-3">{i.kind}</td>
                <td className="py-3 pr-3">{i.detail}</td>
                <td className="py-3 pr-3 type-spec">{i.partnerRef ?? "—"}</td>
                <td className="py-3 pr-3">{canEdit ? <ResolveIssue issueId={i.id} /> : "Finance resolves"}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No differences">
            The nightly reconciliation found the partner&apos;s report and the ledger in agreement.
          </EmptyState>
        )}
      </>
    );
  }

  async function Payments() {
    const rows = await adminPayments(db, actor);
    return rows.length ? (
      <Table label="Payments" head={["Date", "Order", "Method", "Amount", "Partner reference", "Status"]}>
        {rows.map(({ payment: p, reference, orderId }) => (
          <tr key={p.id} className="border-b border-default last:border-b-0">
            <td className="px-4 py-3">{formatIstDateTime(p.confirmedAt ?? p.createdAt)}</td>
            <td className="py-3 pr-3">
              <Link href={`/admin/orders/${orderId}`} className="type-spec hover:underline">
                {reference}
              </Link>
            </td>
            <td className="py-3 pr-3">{p.method}</td>
            <td className="py-3 pr-3 type-spec">{rupees(p.amountPaise)}</td>
            <td className="py-3 pr-3 type-spec">{p.partnerPaymentId}</td>
            <td className="py-3 pr-3">
              <StatusBadge
                status={p.status}
                tone={p.status === "Succeeded" ? "success" : p.status === "Pending" ? "progress" : "error"}
              />
            </td>
          </tr>
        ))}
      </Table>
    ) : (
      <EmptyState title="No payments yet">Payments appear once the partner confirms them.</EmptyState>
    );
  }

  async function Payouts() {
    const rows = await adminPayouts(db, actor);
    return rows.length ? (
      <Table label="Payouts" head={["Run", "Payout", "Supplier", "Amount", "UTR", "Status"]}>
        {rows.map(({ payout: p, supplier }) => (
          <tr key={p.id} className="border-b border-default last:border-b-0">
            <td className="px-4 py-3">{formatIstDate(p.runAt)}</td>
            <td className="py-3 pr-3 type-spec">{p.reference}</td>
            <td className="py-3 pr-3">{supplier}</td>
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
      <EmptyState title="No payouts yet">Payouts run at 11:00 and 16:00 IST on working days.</EmptyState>
    );
  }

  async function Rates() {
    const { rateCards, pilot } = await moneySettings(db, actor);
    return (
      <>
        <Alert
          tone="info"
          title="Rates, caps, TCS and TDS are confirmed by the Chartered Accountant before Launch 2 (M11)"
        >
          Change them in Settings (settings.edit, audited). Each version applies to orders accepted from its effective
          date.
        </Alert>
        <Table
          label="Rate cards"
          head={["Version", "From", "Fee", "Cap", "GST on fee", "TCS", "TDS", "Launch offer", "Status"]}
        >
          {rateCards.map((c) => (
            <tr key={c.version} className="border-b border-default last:border-b-0">
              <td className="px-4 py-3 type-spec">{c.version}</td>
              <td className="py-3 pr-3">{c.effectiveFrom}</td>
              <td className="py-3 pr-3">{c.feeBps / 100}%</td>
              <td className="py-3 pr-3 type-spec">{c.feeCapPaise ? rupees(BigInt(c.feeCapPaise)) : "None"}</td>
              <td className="py-3 pr-3">{c.gstOnFeeBps / 100}%</td>
              <td className="py-3 pr-3">{c.tcsBps / 100}%</td>
              <td className="py-3 pr-3">{c.tdsBps / 100}%</td>
              <td className="py-3 pr-3">
                {c.launchOfferFrom && c.launchOfferTo ? `${c.launchOfferFrom} to ${c.launchOfferTo}` : "Not set"}
              </td>
              <td className="py-3 pr-3">
                <StatusBadge status={c.sample ? "Sample" : "Confirmed"} tone={c.sample ? "warning" : "success"} />
              </td>
            </tr>
          ))}
        </Table>
        <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Pilot companies</h2>
          <p className="type-body-sm text-body">
            {pilot.length
              ? `Ordering is open to ${String(pilot.length)} ${pilot.length === 1 ? "company" : "companies"} only.`
              : "No pilot list: ordering is open to every company while the transactions switch is on."}
          </p>
        </section>
      </>
    );
  }
}
