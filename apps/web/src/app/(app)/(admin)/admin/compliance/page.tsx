import config from "@payload-config";
import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { grievanceClocks, listGrievances, listRequests, listTakedowns } from "@h2india/core/compliance";
import { REPORT_PROBLEMS } from "@h2india/core/products/rules-client";
import { formatIstDayMonth, formatIstTime, istDate } from "@h2india/core/time";
import { Alert, buttonClasses, CountChip, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { NewRequest } from "@/admin/compliance/Controls";
import { clockBadge, dueBadge, durationWords, type Tone } from "@/admin/compliance/views";
import { AdminShell, requireOperator } from "@/admin/shell";

// Compliance requests (660:8), step 11.7: Grievances (660:281), Takedowns (660:851), Corrections (660:1301) and Data
// rights (660:1786), each against its clock, with the states on 661:948. Clock lengths come from the clock settings.
export const metadata: Metadata = { title: "Compliance · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "grievances", label: "Grievances", search: "Search ticket, link or name" },
  { key: "takedowns", label: "Takedowns", search: "Search reference, link or name" },
  { key: "corrections", label: "Corrections", search: "Search reference, page or name" },
  { key: "data-rights", label: "Data rights", search: "Search reference, name or email" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const RIGHT: Record<string, string> = { access: "Access", correct: "Correction", erase: "Erasure" };
const tone = (s: string): Tone =>
  s === "Resolved" || s === "Completed" ? "success" : s === "Received" || s === "Rejected" ? "neutral" : "success";
const closed = (s: string) => s === "Resolved" || s === "Completed" || s === "Rejected";

type Sp = { tab?: string; q?: string; status?: string; type?: string };

export default async function CompliancePage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("compliance.view", "/admin/compliance");
  const tab: TabKey = TABS.find((t) => t.key === sp.tab)?.key ?? "grievances";
  const q = sp.q?.trim() ?? "";
  const status = sp.status === "all" || sp.status === "closed" ? sp.status : "open";
  const type = sp.type ?? "";
  const db = getDb();
  const payload = await getPayload({ config });
  const [grievances, requests, takedowns, corrections, ack, resolve] = await Promise.all([
    listGrievances(db, actor),
    listRequests(db, actor),
    listTakedowns(db, actor),
    payload.find({ collection: "corrections", sort: "-createdAt", limit: 200, depth: 1, overrideAccess: true }),
    clockDuration(db, "grievanceAcknowledge"),
    clockDuration(db, "grievanceResolve"),
  ]);
  const clocks = await grievanceClocks(
    db,
    actor,
    grievances.map((g) => g.id),
  );
  const now = new Date();
  const byStatus = (s: string) => (status === "all" ? true : status === "closed" ? closed(s) : !closed(s));
  const matches = (...words: (string | null | undefined)[]) =>
    !q || words.filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase());

  const counts: Record<TabKey, number> = {
    grievances: grievances.filter((g) => !closed(g.status)).length,
    takedowns: takedowns.filter((t) => !closed(t.status)).length,
    corrections: corrections.docs.filter((c) => c.status === "Open").length,
    "data-rights": requests.filter((r) => !closed(r.status)).length,
  };
  const ackOf = (id: string) => clocks.get(id)?.find((c) => c.type === "grievanceAcknowledge") ?? null;
  const here = TABS.find((t) => t.key === tab) ?? TABS[0];
  const href = (p: Partial<Sp>) => {
    const all: Record<string, string> = { tab, q, status: status === "open" ? "" : status, type, ...p };
    return `/admin/compliance?${new URLSearchParams(Object.entries(all).filter(([, v]) => v)).toString()}`;
  };

  const table = (head: string[], rows: React.ReactNode, label: string) => (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="relative overflow-x-auto rounded-card border border-default bg-page"
    >
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="bg-subtle text-left type-caption text-secondary">
            {head.map((h, i) => (
              <th key={h || `a${String(i)}`} scope="col" className="px-4 py-3">
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
  const ref = (reference: string, caption: string) => (
    <td className="px-4 py-3 align-top">
      <span className="block type-mono">{reference}</span>
      <span className="block type-caption text-secondary">{caption}</span>
    </td>
  );
  const received = (d: Date) => (
    <td className="px-4 py-3 align-top type-body-sm">
      <span className="block">{formatIstDayMonth(d)}</span>
      <span className="block type-caption text-secondary">{formatIstTime(d)}</span>
    </td>
  );
  const what = (title: string, caption: string | null) => (
    <td className="max-w-80 px-4 py-3 align-top">
      <span className="line-clamp-2 block type-label">{title}</span>
      {caption ? <span className="line-clamp-2 block type-caption text-secondary">{caption}</span> : null}
    </td>
  );
  const badge = (b: { text: string; tone: Tone }) => (
    <td className="px-4 py-3 align-top">
      <StatusBadge status={b.text} tone={b.tone} />
    </td>
  );
  const open = (to: string, label: string) => (
    <td className="px-4 py-3 text-right align-top">
      <Link href={to} className={buttonClasses({ variant: "outline", size: "sm" })}>
        Open<span className="sr-only"> {label}</span>
      </Link>
    </td>
  );
  const footer = (n: number, noun: string) => (
    <p className="type-caption text-secondary">
      Showing {n === 2 ? "both" : `all ${String(n)}`}{" "}
      {status === "open" ? "open " : status === "closed" ? "closed " : ""}
      {noun}
    </p>
  );
  const none = (title: string, body: string) => (
    <div className="rounded-card border border-default bg-page">
      {q ? (
        <EmptyState
          kind="no-results"
          icon="search"
          title={`No ${tab === "grievances" ? "ticket" : "request"} matches "${q}"`}
          action={
            <Link href={href({ q: "" })} className={buttonClasses({})}>
              Clear search
            </Link>
          }
        >
          {tab === "grievances"
            ? "Check the number, or search by the complainant's name or email."
            : "Check the reference, or search by name."}
        </EmptyState>
      ) : (
        <EmptyState
          icon="clock"
          title={title}
          action={
            status === "open" ? (
              <Link href={href({ status: "all" })} className={buttonClasses({})}>
                Show closed requests
              </Link>
            ) : undefined
          }
        >
          {body}
        </EmptyState>
      )}
    </div>
  );

  let filters: { name: string; label: string; options: { value: string; label: string }[] } | null = null;
  let body: React.ReactNode;
  if (tab === "grievances") {
    filters = {
      name: "type",
      label: "Type",
      options: ["Content", "Listing", "Privacy", "Payment", "Other"].map((x) => ({ value: x, label: x })),
    };
    const rows = grievances.filter(
      (g) =>
        byStatus(g.status) &&
        (!type || g.type === type) &&
        matches(g.reference, g.name, g.email, g.pageUrl, g.description),
    );
    const today = istDate(now);
    const toAck = grievances.filter((g) => {
      const c = ackOf(g.id);
      return !g.acknowledgedAt && c && istDate(c.dueAt) === today;
    });
    const next = toAck
      .map((g) => ackOf(g.id)?.dueAt)
      .filter((d): d is Date => Boolean(d) && (d?.getTime() ?? 0) > now.getTime());
    next.sort((a, b) => a.getTime() - b.getTime());
    body = (
      <>
        {toAck.length ? (
          <Alert
            tone="warning"
            title={`${String(toAck.length)} ${toAck.length === 1 ? "complaint" : "complaints"} to acknowledge today`}
          >
            Acknowledge within {durationWords(ack)} of receipt.
            {next[0] ? ` The next one is due at ${formatIstTime(next[0])}.` : ""}
          </Alert>
        ) : null}
        {rows.length ? (
          <>
            {table(
              ["Ticket", "Complaint", "Received", "Acknowledge", "Resolve", "Status", "Assignee", ""],
              rows.map((g) => {
                const c = ackOf(g.id);
                return (
                  <tr key={g.id} className="border-t border-default">
                    {ref(g.reference, g.type)}
                    {what(g.pageUrl ?? g.description.split("\n")[0] ?? "", g.pageUrl ? g.description : null)}
                    {received(g.createdAt)}
                    {badge(clockBadge(c?.dueAt ?? null, g.acknowledgedAt, now))}
                    {badge(clockBadge(g.resolveBy, g.resolvedAt, now))}
                    {badge({ text: g.status, tone: tone(g.status) })}
                    <td className="px-4 py-3 align-top type-body-sm">{g.team ?? "Unassigned"}</td>
                    {open(`/admin/compliance/grievances/${g.id}`, g.reference)}
                  </tr>
                );
              }),
              "Grievances",
            )}
            {footer(rows.length, "grievances")}
          </>
        ) : (
          none("No open grievances", "Complaints from the grievance form show here with both clocks.")
        )}
      </>
    );
  } else if (tab === "takedowns") {
    const label = (p: string) => REPORT_PROBLEMS.find((x) => x.value === p)?.label ?? p;
    const rows = takedowns.filter((t) => byStatus(t.status) && matches(t.product, t.details, label(t.problem)));
    body = rows.length ? (
      <>
        {table(
          ["Source", "Request", "Received", "Due", "Status", ""],
          rows.map((t) => (
            <tr key={t.id} className="border-t border-default">
              {ref("Listing report", "Report this listing")}
              {what(t.product, `${label(t.problem)}: ${t.details}`)}
              {received(t.createdAt)}
              {badge({ text: "Time limit not set", tone: "neutral" })}
              {badge({ text: t.status, tone: tone(t.status) })}
              <td className="px-4 py-3 text-right align-top">
                {t.attachments.map((f, i) => (
                  <a key={f} href={`/api/v1/files/${f}/link`} className="mr-3 type-label-sm underline">
                    Evidence {i + 1}
                  </a>
                ))}
                <Link
                  href={`/marketplace/products/${t.slug}`}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  Open listing<span className="sr-only"> {t.product}</span>
                </Link>
              </td>
            </tr>
          )),
          "Takedown requests",
        )}
        {footer(rows.length, "takedown requests")}
      </>
    ) : (
      none(
        "No open takedown requests",
        "Reports from listing pages and notices from rights holders show here as they arrive.",
      )
    );
  } else if (tab === "corrections") {
    const cstatus = (s: string) => (s === "Open" ? "Received" : s);
    const rows = corrections.docs.filter((c) => {
      const title = typeof c.article === "object" ? c.article.title : "";
      return byStatus(cstatus(c.status)) && matches(title, c.description);
    });
    body = rows.length ? (
      <>
        {table(
          ["Page", "Page and what's wrong", "Received", "Status", ""],
          rows.map((c) => {
            const title = typeof c.article === "object" ? c.article.title : `Article ${String(c.article)}`;
            return (
              <tr key={String(c.id)} className="border-t border-default">
                {ref("Article", c.source === "reader" ? "From a reader" : "From an editor")}
                {what(title, c.description)}
                {received(new Date(c.createdAt))}
                {badge({ text: cstatus(c.status), tone: tone(cstatus(c.status)) })}
                {open(`/cms/collections/corrections/${String(c.id)}`, title)}
              </tr>
            );
          }),
          "Corrections",
        )}
        {footer(rows.length, "corrections")}
      </>
    ) : (
      none(
        "No open corrections",
        "Corrections readers suggest show here; publishing one adds a dated note to the page.",
      )
    );
  } else {
    filters = {
      name: "type",
      label: "Right",
      options: Object.entries(RIGHT).map(([value, label]) => ({ value, label })),
    };
    const rows = requests.filter(
      (x) => byStatus(x.status) && (!type || x.kind === type) && matches(x.reference, x.email, x.details),
    );
    body = (
      <>
        {rows.length ? (
          <>
            {table(
              ["Reference", "Person and request", "Received", "Due", "Status", ""],
              rows.map((x) => (
                <tr key={x.id} className="border-t border-default">
                  {ref(x.reference, RIGHT[x.kind] ?? x.kind)}
                  {what(x.email, x.details)}
                  {received(x.createdAt)}
                  {badge(dueBadge(x.dueAt, closed(x.status), now))}
                  {badge({ text: x.status, tone: tone(x.status) })}
                  {open(`/admin/compliance/data-rights/${x.id}`, x.reference)}
                </tr>
              )),
              "Data-rights requests",
            )}
            {footer(rows.length, "data-rights requests")}
          </>
        ) : (
          none(
            "No open data-rights requests",
            "Requests for a copy, a correction or erasure show here with the day they're due.",
          )
        )}
        {can(actor, "compliance.edit") ? (
          <details className="rounded-card border border-default bg-page p-5">
            <summary className="cursor-pointer type-label">Log a request received by email or post</summary>
            <div className="pt-3">
              <NewRequest />
            </div>
          </details>
        ) : null}
      </>
    );
  }

  return (
    <AdminShell userId={userId} current="/admin/compliance" title="Compliance">
      <div className="flex flex-col gap-1">
        <h1 className="type-h2">Compliance requests</h1>
        <p className="type-body-sm text-secondary">
          Complaints, takedown requests, corrections and data-rights requests. Grievances are acknowledged within{" "}
          {durationWords(ack)} and resolved within {durationWords(resolve)}.
        </p>
      </div>
      <nav aria-label="Compliance" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/compliance?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cx(
              "-mb-px inline-flex items-center gap-2 border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <CountChip>{counts[t.key]}</CountChip>
          </Link>
        ))}
      </nav>
      <form method="get" action="/admin/compliance" className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="tab" value={tab} />
        <label className="relative flex min-w-60 flex-1 md:max-w-sm">
          <span className="sr-only">{here.search}</span>
          <Icon name="search" size={18} className="pointer-events-none absolute top-3.5 left-3 text-icon-secondary" />
          <input
            name="q"
            defaultValue={q}
            placeholder={here.search}
            className="h-11 w-full rounded-control border-[1.5px] border-control bg-page pr-3 pl-10 type-body"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="sr-only">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
          >
            <option value="open">Status: open</option>
            <option value="closed">Status: closed</option>
            <option value="all">Status: all</option>
          </select>
        </label>
        {filters ? (
          <label className="flex items-center gap-2">
            <span className="sr-only">{filters.label}</span>
            <select
              name={filters.name}
              defaultValue={type}
              className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
            >
              <option value="">{filters.label}: all</option>
              {filters.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {filters.label}: {o.label.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Apply
        </button>
      </form>
      {body}
    </AdminShell>
  );
}
