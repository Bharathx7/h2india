import config from "@payload-config";
import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { listGrievances, listRequests } from "@h2india/core/compliance";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { NewRequest } from "@/admin/compliance/Controls";
import { AdminShell, requireOperator } from "@/admin/shell";

// Compliance (660:8), step 11.7: Grievances (660:281), Takedowns (660:851), Corrections (660:1301) and Data rights
// (660:1786), each against its deadline: grievances acknowledged in 24 hours and resolved in 15 days, data-rights
// requests answered in 30 days.
export const metadata: Metadata = { title: "Compliance · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "grievances", label: "Grievances" },
  { key: "takedowns", label: "Takedowns" },
  { key: "corrections", label: "Corrections" },
  { key: "data-rights", label: "Data rights" },
] as const;

const tone = (s: string) =>
  s === "Resolved" || s === "Completed"
    ? "success"
    : s === "Received"
      ? "warning"
      : s === "Rejected"
        ? "neutral"
        : "progress";

export default async function CompliancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("compliance.view", "/admin/compliance");
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "grievances";
  const db = getDb();
  const payload = await getPayload({ config });
  const [grievances, requests, corrections] = await Promise.all([
    listGrievances(db, actor),
    listRequests(db, actor),
    payload.find({ collection: "corrections", sort: "-createdAt", limit: 100, depth: 1, overrideAccess: true }),
  ]);
  const now = new Date().getTime();
  const late = (due: Date | null | undefined, done: boolean) => !done && due && due.getTime() < now;
  const counts: Record<string, number> = {
    grievances: grievances.filter((g) => g.status !== "Resolved").length,
    takedowns: 0,
    corrections: corrections.docs.filter((c) => c.status === "Open").length,
    "data-rights": requests.filter((r) => r.status !== "Completed" && r.status !== "Rejected").length,
  };
  const table = (head: string[], rows: React.ReactNode, label: string) => (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="relative overflow-x-auto rounded-card border border-default bg-page"
    >
      <table className="w-full min-w-[860px]">
        <thead>
          <tr className="bg-subtle text-left type-caption text-secondary">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3">
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
  let body: React.ReactNode;
  if (tab === "grievances") {
    body = grievances.length ? (
      table(
        ["Ticket", "Type", "From", "Received", "Resolve by", "Status", ""],
        grievances.map((g) => (
          <tr key={g.id} className="border-t border-default">
            <td className="px-4 py-3 type-mono">{g.reference}</td>
            <td className="px-4 py-3 type-body-sm">{g.type}</td>
            <td className="px-4 py-3 type-body-sm">{g.name}</td>
            <td className="px-4 py-3 type-body-sm">{formatIstDateTime(g.createdAt)}</td>
            <td
              className={cx("px-4 py-3 type-body-sm", late(g.resolveBy, g.status === "Resolved") ? "text-error" : "")}
            >
              {formatIstDate(g.resolveBy)}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={g.status} tone={tone(g.status)} />
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/admin/compliance/grievances/${g.id}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                Open<span className="sr-only"> {g.reference}</span>
              </Link>
            </td>
          </tr>
        )),
        "Grievances",
      )
    ) : (
      <div className="rounded-card border border-default bg-page">
        <EmptyState title="No grievances">
          Complaints from the public grievance form show here with their deadlines.
        </EmptyState>
      </div>
    );
  } else if (tab === "takedowns") {
    body = (
      <div className="rounded-card border border-default bg-page">
        <EmptyState title="No takedown requests">
          Takedown requests are logged as grievances (type Content or Listing) until the lawyer confirms the time limits
          for takedowns (M2).
        </EmptyState>
      </div>
    );
  } else if (tab === "corrections") {
    body = corrections.docs.length ? (
      table(
        ["Article", "Source", "Reported", "Status", ""],
        corrections.docs.map((c) => (
          <tr key={String(c.id)} className="border-t border-default">
            <td className="px-4 py-3 type-label">
              {typeof c.article === "object" ? c.article.title : `Article ${String(c.article)}`}
            </td>
            <td className="px-4 py-3 type-body-sm">{c.source === "reader" ? "Reader" : "Editor"}</td>
            <td className="px-4 py-3 type-body-sm">{formatIstDateTime(new Date(c.createdAt))}</td>
            <td className="px-4 py-3">
              <StatusBadge status={c.status} tone={c.status === "Open" ? "warning" : "success"} />
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/cms/collections/corrections/${String(c.id)}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                Review
              </Link>
            </td>
          </tr>
        )),
        "Corrections",
      )
    ) : (
      <div className="rounded-card border border-default bg-page">
        <EmptyState title="No corrections">
          Corrections readers suggest show here; publishing one adds a dated note to the article.
        </EmptyState>
      </div>
    );
  } else {
    body = (
      <>
        {can(actor, "compliance.edit") ? (
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Log a request</h2>
            <NewRequest />
          </section>
        ) : null}
        {requests.length ? (
          table(
            ["Reference", "Request", "Email", "Received", "Due", "Status", ""],
            requests.map((x) => (
              <tr key={x.id} className="border-t border-default">
                <td className="px-4 py-3 type-mono">{x.reference}</td>
                <td className="px-4 py-3 type-body-sm">
                  {x.kind === "access" ? "Copy of data" : x.kind === "correct" ? "Correction" : "Erasure"}
                </td>
                <td className="px-4 py-3 type-body-sm">{x.email}</td>
                <td className="px-4 py-3 type-body-sm">{formatIstDate(x.createdAt)}</td>
                <td
                  className={cx(
                    "px-4 py-3 type-body-sm",
                    late(x.dueAt, x.status === "Completed" || x.status === "Rejected") ? "text-error" : "",
                  )}
                >
                  {formatIstDate(x.dueAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={x.status} tone={tone(x.status)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/compliance/data-rights/${x.id}`}
                    className={buttonClasses({ variant: "outline", size: "sm" })}
                  >
                    Open<span className="sr-only"> {x.reference}</span>
                  </Link>
                </td>
              </tr>
            )),
            "Data-rights requests",
          )
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="No data-rights requests">
              Requests for a copy, a correction or erasure show here, due 30 days after receipt.
            </EmptyState>
          </div>
        )}
      </>
    );
  }
  return (
    <AdminShell userId={userId} current="/admin/compliance" title="Compliance">
      <div>
        <h1 className="type-h2">Compliance</h1>
        <p className="type-body-sm text-secondary">
          Grievances, takedowns, corrections and data-rights requests, each against its legal deadline.
        </p>
      </div>
      <nav aria-label="Compliance" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/compliance?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>
      {body}
    </AdminShell>
  );
}
