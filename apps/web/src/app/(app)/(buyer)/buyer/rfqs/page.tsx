import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { buyerRfqs, rfqBadge, RFQ_TABS, type RfqStatus } from "@h2india/core/rfq";
import { formatIstDateTime, formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";

// RFQs (557:8; phones 558:124; states 558:8), step 9.6: the company's requests by tab, with quotes in, the offer
// deadline countdown and the designed badge. ?state= forces the loading, empty and error states.
export const metadata: Metadata = { title: "RFQs · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;

function countdown(deadline: Date | null, now: Date) {
  if (!deadline) return null;
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return { label: "Deadline passed", warn: true };
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return { label: "Closes today", warn: true };
  if (days === 1) return { label: "Closes tomorrow", warn: true };
  return { label: `${String(days)} days left`, warn: false };
}

export default async function BuyerRfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireBuyer("/buyer/rfqs");
  const db = getDb();
  const [rows, expiring] = await Promise.all([
    buyerRfqs(db, scopeFor(page.actor), page.buyer.organisationId),
    clockDuration(db, "rfqExpiring"),
  ]);
  const now = new Date();
  const tab = RFQ_TABS.find((t) => t.key === sp.tab) ?? RFQ_TABS[2];
  const inTab = (status: string, t: (typeof RFQ_TABS)[number]) => (t.statuses as readonly string[]).includes(status);
  const q = sp.q?.trim().toLowerCase() ?? "";
  const shown = rows.filter(
    (x) => inTab(x.rfq.status, tab) && (!q || `${x.rfq.reference} ${x.rfq.title}`.toLowerCase().includes(q)),
  );
  return (
    <BuyerWorkspace page={page} current="/buyer/rfqs">
      <div>
        <h1 className="type-h2">RFQs</h1>
        <p className="type-body-sm text-secondary">
          Requests for quotes from your company. Suppliers reply within the offer deadline you set.
        </p>
      </div>
      <nav aria-label="RFQ tabs" className="flex gap-6 overflow-x-auto border-b border-default">
        {RFQ_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/buyer/rfqs?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab.key ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{rows.filter((x) => inTab(x.rfq.status, t)).length}</span>
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap gap-3">
        <input type="hidden" name="tab" value={tab.key} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search by RFQ ref or title"
          placeholder="Search by RFQ ref or title"
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
            <EmptyState
              title={rows.length ? `No RFQs in ${tab.label}` : "No RFQs yet"}
              action={
                <Link href="/rfq/new" className={buttonClasses({})}>
                  Request a quote
                </Link>
              }
            >
              {rows.length
                ? "They move between tabs as suppliers quote and you decide."
                : "Ask up to 5 verified suppliers for quotes in one request."}
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
                  RFQ ref
                </th>
                <th scope="col" className="px-2 py-3">
                  Title
                </th>
                <th scope="col" className="px-2 py-3">
                  Category
                </th>
                <th scope="col" className="px-2 py-3">
                  Quotes
                </th>
                <th scope="col" className="px-2 py-3">
                  Offer deadline
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((x) => {
                const badge = rfqBadge(
                  {
                    status: x.rfq.status as RfqStatus,
                    offerDeadline: x.rfq.offerDeadline,
                    suppliers: x.suppliers,
                    quoted: x.quoted,
                  },
                  hoursOf(expiring) * 3_600_000,
                  now,
                );
                const left =
                  x.rfq.status === "Sent" || x.rfq.status === "Quotes received"
                    ? countdown(x.rfq.offerDeadline, now)
                    : null;
                const draft = x.rfq.status === "Draft" || x.rfq.status === "Returned";
                const href = draft ? `/rfq/new?draft=${x.rfq.id}` : `/buyer/rfqs/${x.rfq.id}`;
                return (
                  <tr key={x.rfq.id} className="border-t border-default align-top">
                    <td className="px-4 py-3 type-mono">{x.rfq.reference}</td>
                    <td className="px-2 py-3">
                      <Link href={href} className="block type-label hover:underline">
                        {x.rfq.title || "Untitled request"}
                      </Link>
                      <span className="block type-caption text-secondary">
                        {x.createdByName} · {formatIstDayMonth(x.rfq.createdAt)}
                      </span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">{x.category ?? "—"}</td>
                    <td className="px-2 py-3 type-mono">
                      {x.quoted}/{x.suppliers}
                    </td>
                    <td className="px-2 py-3">
                      {left ? (
                        <span className={cx("flex items-center gap-1 type-label", left.warn ? "text-warning" : "")}>
                          <Icon name="clock" size={14} />
                          {left.label}
                        </span>
                      ) : null}
                      <span className="block type-caption text-secondary">
                        {x.rfq.offerDeadline ? formatIstDateTime(x.rfq.offerDeadline) : "—"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={badge.label} tone={badge.tone} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={href} className={buttonClasses({ variant: "outline", size: "sm" })}>
                        {draft ? "Continue" : "Open"}
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
      <p className="type-caption text-secondary">
        RFQs sent to more than one supplier are checked by H2 Economy within 1 working day before suppliers see them.
      </p>
    </BuyerWorkspace>
  );
}
