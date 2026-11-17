import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { QUEUES, queueViews } from "@h2india/core/queues";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { queueItems } from "@/admin/queues/data";
import { Claim, DeleteView, SaveView } from "@/admin/queues/Moderate";
import { AdminShell, requireOperator } from "@/admin/shell";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { QueueTabs } from "../QueueTabs";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Queues · Suppliers (627:8), Content (629:1625), Events (630:8), Jobs (630:570) and Comments (630:968), with their
// states (630:1593), step 11.2. Listings and RFQs have their own pages. Age turns amber at 24 hours and red at 48.
export const metadata: Metadata = { title: "Queues · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "all", label: "All open" },
  { key: "mine", label: "Assigned to me" },
  { key: "unassigned", label: "Unassigned" },
  { key: "late", label: "Past SLA" },
] as const;
const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ queue: string }>;
  searchParams: Promise<{ view?: string; q?: string; state?: string; page?: string; perPage?: string }>;
}) {
  const { queue: key } = await params;
  const queue = QUEUES.find((q) => q.key === key);
  if (!queue || key === "listings" || key === "rfqs") notFound();
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("queues.view", `/admin/queues/${key}`);
  const db = getDb();
  const [items, amber, red, saved] = await Promise.all([
    queueItems(actor, queue.key),
    clockDuration(db, "queueAmber"),
    clockDuration(db, "queueRed"),
    queueViews(db, userId, queue.key),
  ]);
  const view = VIEWS.find((v) => v.key === sp.view)?.key ?? "all";
  const now = new Date().getTime();
  const q = sp.q?.trim().toLowerCase() ?? "";
  const rows = items
    .map((x) => {
      const h = x.submittedAt ? (now - x.submittedAt.getTime()) / 3_600_000 : 0;
      const tone: "success" | "warning" | "error" =
        h >= hoursOf(red) ? "error" : h >= hoursOf(amber) ? "warning" : "success";
      return {
        ...x,
        age: h >= 1 ? `${String(Math.floor(h))} h` : `${String(Math.max(1, Math.round(h * 60)))} m`,
        tone,
      };
    })
    .filter(
      (x) =>
        (view === "all" ||
          (view === "mine" ? x.claimedBy === userId : view === "unassigned" ? !x.claimedBy : x.tone === "error")) &&
        (!q || `${x.title} ${x.organisation} ${x.submitter}`.toLowerCase().includes(q)),
    );
  const paged = pageOf(rows, pageRequest(sp));
  const canDecide = can(actor, "queues.edit");
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <div>
        <h1 className="type-h2">Queues</h1>
        <p className="type-body text-secondary">
          Everything waiting for a decision. Age turns amber close to the SLA and red once it&apos;s passed.
        </p>
      </div>
      <QueueTabs current={queue.key} actor={actor} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">Views</span>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/queues/${key}?view=${v.key}`}
            aria-current={view === v.key ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
              view === v.key ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
            )}
          >
            {v.label}
          </Link>
        ))}
        {saved.map((v) => {
          const here = view === v.view && (sp.q?.trim() ?? "") === v.search;
          return (
            <span
              key={v.id}
              className={cx(
                "inline-flex h-9 items-center gap-1 rounded-pill border-[1.5px] pr-1 pl-3 type-label",
                here ? "border-transparent bg-mint" : "border-control bg-page",
              )}
            >
              <Link
                href={`/admin/queues/${key}?${new URLSearchParams({ view: v.view, ...(v.search ? { q: v.search } : {}) }).toString()}`}
                aria-current={here ? "page" : undefined}
              >
                {v.name}
              </Link>
              <DeleteView queue={queue.key} id={v.id} name={v.name} />
            </span>
          );
        })}
        <SaveView queue={queue.key} view={view} search={sp.q?.trim() ?? ""} />
      </div>
      <form method="get" className="flex flex-wrap gap-3">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search title or organisation"
          placeholder="Search title or organisation"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
      </form>
      <LiveSection
        label={queue.label}
        state={forcedState(sp.state) ?? (rows.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-2">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState title={key === "comments" ? "No comments to review" : "Nothing waiting"}>
              {key === "comments"
                ? "Public comments are off at launch (C9). When they open, comments needing review show here."
                : `New ${queue.label.toLowerCase()} show here as they arrive.`}
            </EmptyState>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="region"
          aria-label={`${queue.label} waiting`}
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
                <tr key={x.id} className="border-t border-default align-top">
                  <td className="px-4 py-3">
                    <span className="block type-label">{x.title}</span>
                    <span className="block type-caption text-secondary">{x.line}</span>
                  </td>
                  <td className="px-2 py-3">
                    <span className="block type-body-sm">{x.submitter}</span>
                    <span className="block type-caption text-secondary">{x.organisation}</span>
                  </td>
                  <td className="px-2 py-3 type-body-sm">{x.submittedAt ? formatIstDateTime(x.submittedAt) : ""}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={x.age} tone={x.tone} />
                  </td>
                  <td className="px-2 py-3 type-body-sm">
                    {x.claimer ?? (canDecide ? <Claim queue={queue.key} id={x.id} toMe label="Assign to me" /> : "—")}
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge
                      status={x.claimer ? "In review" : "Waiting"}
                      tone={x.claimer ? "success" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={x.href} className={buttonClasses({ variant: "outline", size: "sm" })}>
                      Review<span className="sr-only"> {x.title}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPager paged={paged} query={pagingQuery(sp)} className="mt-4" />
      </LiveSection>
      <p className="type-caption text-secondary">
        Showing {rows.length} · {queue.sla}
      </p>
    </AdminShell>
  );
}
