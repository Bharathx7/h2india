import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { supplierRfqs } from "@h2india/core/rfq";
import { formatIstDate, formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { dueBadge, inboxTab, quoteBadge, type InboxTab } from "@/supplier/rfq/views";

// RFQ inbox (615:8; phones 616:346; states 621:1030), step 9.5: every RFQ sent to the company, by tab. ?state= forces
// the designed loading, empty and error states.
export const metadata: Metadata = { title: "RFQs · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: { key: InboxTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "quote", label: "To quote" },
  { key: "quoted", label: "Quoted" },
  { key: "accepted", label: "Accepted" },
  { key: "closed", label: "Closed" },
];

export default async function SupplierRfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/rfqs");
  const s = page.supplier;
  const db = getDb();
  const rows = await supplierRfqs(db, scopeFor(page.actor), s.organisationId);
  const now = new Date();
  const facts = rows.map((x) => {
    const f = {
      rfqStatus: x.rfq.status,
      recipient: x.recipient.status,
      quoteStatus: x.quote?.status ?? null,
      sentVersion: x.quote?.sentVersion ?? null,
      offerDeadline: x.rfq.offerDeadline,
      validUntil: x.validUntil ? new Date(x.validUntil) : null,
    };
    return { x, tab: inboxTab(f), badge: quoteBadge(f, now) };
  });
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "all";
  const q = sp.q?.trim().toLowerCase() ?? "";
  const shown = facts.filter(
    (r) =>
      (tab === "all" || r.tab === tab) &&
      (!q || `${r.x.rfq.reference} ${r.x.rfq.title} ${r.x.buyer}`.toLowerCase().includes(q)),
  );
  const count = (k: InboxTab) => (k === "all" ? facts.length : facts.filter((r) => r.tab === k).length);
  return (
    <SupplierShell page={page} current="/supplier/rfqs" title="RFQs">
      <div>
        <h1 className="type-h2">RFQs</h1>
        <p className="type-body-sm text-secondary">
          Requests for quotes sent to {s.tradeName}. Quote before the due time.
        </p>
      </div>
      <nav aria-label="RFQ tabs" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/supplier/rfqs?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{count(t.key)}</span>
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap gap-3">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search by RFQ number, buyer or product"
          placeholder="Search by RFQ number, buyer or product"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
      </form>
      <LiveSection
        label="RFQs"
        state={forcedState(sp.state) ?? (shown.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-2">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState title={facts.length ? "Nothing in this tab" : "No RFQs yet"}>
              {facts.length
                ? "RFQs move here as you quote and buyers decide."
                : "Buyers' requests for the categories you list arrive here. Keep your listings complete so you're matched."}
            </EmptyState>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="region"
          aria-label="RFQs"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  RFQ
                </th>
                <th scope="col" className="px-2 py-3">
                  Buyer
                </th>
                <th scope="col" className="px-2 py-3">
                  Qty
                </th>
                <th scope="col" className="px-2 py-3">
                  Quotes due
                </th>
                <th scope="col" className="px-2 py-3">
                  Your quote
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ x, badge, tab: t }) => {
                const due = x.rfq.status === "Closed" ? null : dueBadge(x.rfq.offerDeadline, now);
                const action =
                  t === "quote"
                    ? x.quote
                      ? { label: "Continue", variant: "outline" as const }
                      : {
                          label: "Write quote",
                          variant: x.recipient.status === "Sent" ? ("primary" as const) : ("outline" as const),
                        }
                    : {
                        label: t === "accepted" ? "View" : t === "quoted" ? "View quote" : "View",
                        variant: "ghost" as const,
                      };
                return (
                  <tr key={x.rfq.id} className="border-t border-default align-top">
                    <td className="px-4 py-3">
                      <span className="block type-mono text-secondary">{x.rfq.reference}</span>
                      <span className="block type-label">{x.rfq.title}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="block type-body-sm">{x.buyer}</span>
                      <span className="block type-caption text-secondary">{x.buyerCity ?? ""}</span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">{x.quantity}</td>
                    <td className="px-2 py-3">
                      {due ? <StatusBadge status={due.label} tone={due.tone} /> : null}
                      <span className="block type-caption text-secondary">
                        {x.rfq.status === "Closed" && x.rfq.closedAt
                          ? `Closed ${formatIstDayMonth(x.rfq.closedAt)}`
                          : x.rfq.offerDeadline
                            ? formatIstDate(x.rfq.offerDeadline)
                            : ""}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={badge.label} tone={badge.tone} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/supplier/rfqs/${x.rfq.id}`}
                        className={buttonClasses({ variant: action.variant, size: "sm" })}
                      >
                        {action.label}
                        <span className="sr-only"> {x.rfq.reference}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </LiveSection>
    </SupplierShell>
  );
}
