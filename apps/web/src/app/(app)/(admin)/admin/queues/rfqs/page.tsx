import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { moderationQueue } from "@h2india/core/rfq";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { QueueTabs } from "../QueueTabs";
import { AssignButton } from "./Decision";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Queues · RFQs (629:1148), step 9.4: RFQs to two or more suppliers, checked within 1 working day. Age turns amber at
// the queueAmber clock and red at queueRed (24 and 48 hours).
export const metadata: Metadata = { title: "RFQ queue · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "all", label: "All open" },
  { key: "mine", label: "Assigned to me" },
  { key: "unassigned", label: "Unassigned" },
  { key: "late", label: "Past SLA" },
] as const;

const ageTone = (h: number, red: number, amber: number): "error" | "warning" | "success" =>
  h >= red ? "error" : h >= amber ? "warning" : "success";

const hours = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 1) * 24;

export default async function RfqQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("queues.view", "/admin/queues/rfqs");
  const db = getDb();
  const view = VIEWS.find((v) => v.key === sp.view)?.key ?? "all";
  const [rows, amber, red] = await Promise.all([
    moderationQueue(db, actor, { view: view === "late" ? "all" : view, q: sp.q?.trim() }),
    clockDuration(db, "queueAmber"),
    clockDuration(db, "queueRed"),
  ]);
  const now = new Date().getTime();
  const lines = rows
    .map((x) => {
      const ageH = x.rfq.submittedAt ? (now - x.rfq.submittedAt.getTime()) / 3_600_000 : 0;
      const failed = x.checks.filter((c) => !c.ok);
      return {
        ...x,
        failed,
        age:
          ageH >= 1
            ? `${String(Math.floor(ageH))} h${ageH % 1 >= 1 / 60 ? ` ${String(Math.floor((ageH % 1) * 60))} m` : ""}`
            : `${String(Math.max(1, Math.round(ageH * 60)))} m`,
        tone: ageTone(ageH, hours(red), hours(amber)),
      };
    })
    .filter((r) => view !== "late" || r.tone === "error");
  const paged = pageOf(lines, pageRequest(sp));
  const canDecide = can(actor, "queues.edit");
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <div>
        <h1 className="type-h2">Queues</h1>
        <p className="type-body text-secondary">
          Everything waiting for a decision. Age turns amber close to the SLA and red once it&apos;s passed.
        </p>
      </div>
      <QueueTabs current="rfqs" actor={actor} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">Views</span>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/queues/rfqs?view=${v.key}`}
            aria-current={view === v.key ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
              view === v.key ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap gap-3">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search RFQ number, buyer or product"
          placeholder="Search RFQ number, buyer or product"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
      </form>
      {lines.length ? (
        <div className="flex flex-col gap-4">
          <div
            tabIndex={0}
            role="region"
            aria-label="RFQs waiting"
            className="relative overflow-x-auto rounded-card border border-default bg-page"
          >
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-subtle text-left type-caption text-secondary">
                  <th scope="col" className="px-4 py-3">
                    Item
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Submitted by
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Submitted
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Age vs SLA
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Assignee
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
                {paged.rows.map((x) => (
                  <tr key={x.rfq.id} className="border-t border-default align-top">
                    <td className="px-4 py-3">
                      <span className="block type-label">{x.rfq.title}</span>
                      <span className="block type-mono text-secondary">{x.rfq.reference}</span>
                      <span className={cx("block type-caption", x.failed.length ? "text-warning" : "text-secondary")}>
                        {x.failed.length
                          ? `Flagged: ${x.failed.map((c) => c.flag).join(", ")}`
                          : `Company buyer · all checks passed${x.files ? ` · ${String(x.files)} files attached` : ""}`}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="block type-body-sm">{x.submitter}</span>
                      <span className="block type-caption text-secondary">{x.company}</span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {x.rfq.submittedAt ? formatIstDateTime(x.rfq.submittedAt) : ""}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={x.age} tone={x.tone} />
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {x.moderator ?? (canDecide ? <AssignButton id={x.rfq.id} toMe label="Assign to me" /> : "—")}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge
                        status={x.moderator ? "In review" : "Waiting"}
                        tone={x.moderator ? "success" : "neutral"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/queues/rfqs/${x.rfq.id}`}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        Review<span className="sr-only"> {x.rfq.reference}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPager paged={paged} query={pagingQuery(sp)} />
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="Nothing waiting">
            RFQs to two or more suppliers show here when buyers send them.
          </EmptyState>
        </div>
      )}
      <p className="type-caption text-secondary">{lines.length} waiting · moderate within 1 working day</p>
    </AdminShell>
  );
}
