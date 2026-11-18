import { cx, EmptyState, Icon, Pagination, StatusBadge } from "@h2india/ui";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import type { Metadata } from "next";
import Link from "next/link";
import { allStandards } from "@/knowledge/data";
import { ListFilters, SortBy, type FilterGroupSpec } from "@/opportunities/filters";
import { Crumbs, wrap } from "@/opportunities/parts";
import type { Standard } from "@/payload-types";

// Standards and regulations library (735:4138, step 5.6): every standard, rule, notification and guideline that
// applies to hydrogen in India, summarised. We link to the issuer and never host the texts.

export const metadata: Metadata = {
  title: "Standards and regulations library · H2 Economy",
  description:
    "The standards, rules and notifications that apply to hydrogen in India, summarised, with official links.",
  alternates: { canonical: "/knowledge/standards" },
};
export const dynamic = "force-dynamic";

const TYPES = ["Standard", "Rule", "Notification", "Guideline", "Regulation"];
const STATUSES = ["In force", "Draft", "Superseded", "Withdrawn"];
type Search = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";

const yearOf = (s: Standard) => (s.dated ? new Date(s.dated).getFullYear() : Number(/:(\d{4})/.exec(s.code)?.[1] ?? 0));
const monthYear = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    .format(new Date(iso))
    .toUpperCase();

export default async function StandardsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const standards = await allStandards();
  const issuers = all(s.issuer);
  const types = all(s.type);
  const statuses = all(s.status).length ? all(s.status) : ["In force"];
  const q = one(s.q).trim().toLowerCase().slice(0, 80);
  const sort = one(s.sort);
  let list = standards.filter(
    (x) =>
      (!issuers.length || issuers.includes(x.issuer)) &&
      (!types.length || types.includes(x.kind)) &&
      statuses.includes(x.inForce ?? "In force") &&
      (!q || [x.code, x.title, x.summary, ...(x.appliesTo ?? [])].join(" ").toLowerCase().includes(q)),
  );
  list = [...list].sort((a, b) =>
    sort === "code" ? a.code.localeCompare(b.code) : sort === "oldest" ? yearOf(a) - yearOf(b) : yearOf(b) - yearOf(a),
  );
  const shown = pageSlice(list, s.page);
  const groups: FilterGroupSpec[] = [
    {
      kind: "checks",
      name: "issuer",
      title: "Issuing body",
      options: [...new Set(standards.map((x) => x.issuer))].sort().map((v) => ({ value: v, label: v })),
    },
    { kind: "checks", name: "type", title: "Type", options: TYPES.map((v) => ({ value: v, label: v })) },
    {
      kind: "checks",
      name: "status",
      title: "Status",
      options: STATUSES.map((v) => ({ value: v, label: v })),
      defaults: ["In force"],
    },
  ];
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Knowledge", href: "/knowledge" }, { label: "Standards and regulations" }]} />
        <h1 className="mt-2 type-h1 text-primary">Standards and regulations library</h1>
        <p className="max-w-180 type-body text-body">
          The standards, rules and notifications that apply to hydrogen in India, summarised. We link to the issuer; we
          never host the texts.
        </p>
      </div>
      <div id="list" className={cx(wrap, "flex scroll-mt-24 flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="lg:w-60 lg:shrink-0">
          <ListFilters groups={groups} count={list.length} noun="records" keep={["q", "sort"]} />
        </div>
        <section aria-label="Standards and regulations" className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <form action="/knowledge/standards#list" role="search" className="min-w-60 flex-1">
              {issuers.map((v) => (
                <input key={`i${v}`} type="hidden" name="issuer" value={v} />
              ))}
              {types.map((v) => (
                <input key={`t${v}`} type="hidden" name="type" value={v} />
              ))}
              <label className="flex h-11.5 items-center gap-2 rounded-control border border-input bg-page px-4 focus-within:field-focus">
                <Icon name="search" size={18} className="text-icon-secondary" />
                <span className="sr-only">Search the library</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  maxLength={80}
                  placeholder="Search by number, title or topic"
                  className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
                />
              </label>
            </form>
            <SortBy
              options={[
                { value: "", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "code", label: "By number" },
              ]}
            />
          </div>
          <p className="type-caption text-secondary" role="status">
            {list.length} {list.length === 1 ? "record" : "records"}
            {statuses.length === 1 ? ` ${(statuses[0] ?? "").toLowerCase()}` : ""}
          </p>
          {list.length ? (
            <ul className="flex flex-col gap-3">
              {shown.items.map((x) => (
                <li key={x.id}>
                  <Link
                    href={`/knowledge/standards/${x.slug}`}
                    className="flex items-start gap-4 rounded-card border border-default p-4 hover:border-focus"
                  >
                    <span className="flex h-8 min-w-16 items-center justify-center rounded-control bg-subtle px-2 type-spec text-primary">
                      {x.issuer.split(/\s/)[0]}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-label-sm text-secondary">
                        {x.kind.toUpperCase()}
                        {x.dated ? ` · ${monthYear(x.dated)}` : yearOf(x) ? ` · ${String(yearOf(x))}` : ""}
                      </span>
                      <span className="type-label text-link">
                        {x.kind === "Standard" && x.code !== x.title ? `${x.code} · ` : ""}
                        {x.title}
                      </span>
                      <span className="type-body-sm text-body">{x.summary}</span>
                    </span>
                    <StatusBadge
                      status={x.inForce ?? "In force"}
                      tone={(x.inForce ?? "In force") === "In force" ? "success" : "neutral"}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {shown.total > LIST_PER_PAGE ? (
            <Pagination
              page={shown.page}
              perPage={LIST_PER_PAGE}
              total={shown.total}
              perPageOptions={[LIST_PER_PAGE]}
              query={pagingQuery(s)}
            />
          ) : null}
          {list.length ? null : (
            <div className="rounded-card border border-default py-6">
              <EmptyState kind="no-results" title="No records match">
                Try another search or filter.
              </EmptyState>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
