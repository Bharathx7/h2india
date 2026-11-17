import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { listingQueue } from "@h2india/core/products";
import { storefrontQueue } from "@h2india/core/supplier";
import { formatIstDateTime } from "@h2india/core/time";
import { cx, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { QueueTabs } from "../QueueTabs";
import { QueueTable, type QueueRow } from "./QueueTable";
import { StorefrontDecision } from "./StorefrontDecision";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Queues · Listings (629:367), step 8.3: every new listing and listing change waiting for a decision, oldest first.
// Age turns amber at the queueAmber clock and red at queueRed (System settings 707:793). The other queues are 11.2.
export const metadata: Metadata = { title: "Queues · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "all", label: "All open" },
  { key: "mine", label: "Assigned to me" },
  { key: "unassigned", label: "Unassigned" },
  { key: "late", label: "Past SLA" },
] as const;

const hours = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 1) * 24;

export default async function ListingsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; kind?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("queues.view", "/admin/queues/listings");
  const db = getDb();
  const view = VIEWS.find((v) => v.key === sp.view)?.key ?? "all";
  const [rows, amber, red, storefronts] = await Promise.all([
    listingQueue(db, actor, { view: view === "late" ? "all" : view, q: sp.q?.trim(), kind: sp.kind || undefined }),
    clockDuration(db, "queueAmber"),
    clockDuration(db, "queueRed"),
    storefrontQueue(db, actor),
  ]);
  const now = new Date().getTime();
  const lines: QueueRow[] = rows
    .map((x): QueueRow => {
      const ageH = x.r.submittedAt ? (now - x.r.submittedAt.getTime()) / 3_600_000 : 0;
      const failed = x.r.checks.filter((c) => !c.ok);
      return {
        id: x.r.id,
        name: x.name,
        model: x.model,
        line: `${x.company} · ${x.r.kind} · ${failed.length ? `${String(failed.length)} check failed: ${failed.map((c) => c.detail ?? c.label).join(", ")}` : "all checks passed"}`,
        failed: failed.length > 0,
        submitter: x.submitter ?? "",
        company: x.company,
        submitted: x.r.submittedAt ? formatIstDateTime(x.r.submittedAt) : "",
        age: ageH >= 1 ? `${String(Math.floor(ageH))} h` : `${String(Math.max(1, Math.round(ageH * 60)))} m`,
        ageTone: ageH >= hours(red) ? "error" : ageH >= hours(amber) ? "warning" : "success",
        assignee: x.assignee,
      };
    })
    .filter((r) => view !== "late" || r.ageTone === "error");
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
      <QueueTabs current="listings" actor={actor} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">Views</span>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/queues/listings?view=${v.key}`}
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
          aria-label="Search product, model or supplier"
          placeholder="Search product, model or supplier"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
        <select
          name="kind"
          defaultValue={sp.kind ?? ""}
          aria-label="Change"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="">Change: all</option>
          {["new listing", "spec change", "category change", "certificate added", "from datasheet"].map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </form>
      {lines.length ? (
        <div className="flex flex-col gap-4">
          {/* Keyed by page so a selection never carries over to rows that aren't shown. */}
          <QueueTable key={`${String(paged.page)}-${String(paged.perPage)}`} rows={paged.rows} canDecide={canDecide} />
          <ListPager paged={paged} query={pagingQuery(sp)} />
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="Nothing waiting">
            New listings and listing changes show here as suppliers send them.
          </EmptyState>
        </div>
      )}
      {storefronts.length ? (
        <section aria-labelledby="storefronts" className="flex flex-col gap-3">
          <h2 id="storefronts" className="type-h3">
            Storefront changes
          </h2>
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
            {storefronts.map((s) => (
              <li key={s.r.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <p className="type-label">{s.company ?? "Company"}</p>
                  <p className="type-caption text-secondary">
                    Sent {formatIstDateTime(s.r.submittedAt)}
                    {s.slug ? (
                      <>
                        {" · "}
                        <Link href={`/directory/companies/${s.slug}`} className="underline">
                          Live profile
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {/* Founder QC (17 Nov 2026): labelled fields in the editor's words, not raw JSON keys. */}
                  <dl className="mt-2 grid gap-1 type-caption">
                    {storefrontLines(s.r.data).map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
                        <dt className="text-secondary">{label}</dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {canDecide ? <StorefrontDecision id={s.r.id} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="type-caption text-secondary">
        Showing all {lines.length} · amber after {hours(amber)} h, red after {hours(red)} h
      </p>
    </AdminShell>
  );
}

/** A storefront change as the operator reads it: the editor's labels, lists joined, the logo as "New logo". */
function storefrontLines(data: Record<string, unknown>): [string, string][] {
  const LABELS: Record<string, string> = {
    logoFileId: "Logo",
    about: "About",
    city: "City",
    foundedYear: "Founded",
    categories: "Makes or offers",
    capabilities: "Capabilities",
    capacity: "Yearly capacity",
    leadTime: "Lead time",
    industries: "Industries",
    locations: "Locations",
    website: "Website",
    contactEmail: "Sales email",
    contactPhone: "Sales phone",
  };
  const text = (k: string, v: unknown): string => {
    if (k === "logoFileId") return "Uploaded (opens from the company's profile once approved)";
    if (k === "locations" && Array.isArray(v))
      return (v as { name: string; city: string; state: string; kind: string }[])
        .map((l) => `${l.name} (${[l.kind, l.city, l.state].filter(Boolean).join(", ")})`)
        .join("; ");
    if (Array.isArray(v)) return v.join(", ");
    return typeof v === "string" || typeof v === "number" ? String(v) : "";
  };
  return Object.entries(LABELS)
    .map(([k, label]): [string, string] => [label, text(k, data[k])])
    .filter(([, v]) => v !== "");
}
