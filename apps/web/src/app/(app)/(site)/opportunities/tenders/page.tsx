import { buttonClasses, cx, StatusBadge, TenderCard } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ISSUER_TYPES, TENDER_CATEGORIES, VALUE_BANDS } from "@/cms/records/opportunities";
import { STATE_OPTIONS } from "@/cms/records/states";
import { forcedState } from "@/lib/dev-state";
import { allTenders } from "@/opportunities/data";
import { ExpandButton, ListFilters, PerPage, SortBy, type FilterGroupSpec } from "@/opportunities/filters";
import { CardsLoading, Crumbs, DaysBadge, LoadError, memberHref, ViewToggle, wrap } from "@/opportunities/parts";
import {
  DEFAULT_TENDER_STATUSES,
  filterTenders,
  NOT_PUBLISHED,
  sortTenders,
  stateLabel,
  TENDER_STATUSES,
  tenderRow,
  type TenderRow,
} from "@/opportunities/views";
import { siteViewer } from "@/server/site";

// Tenders (table 455:1621, cards 456:2183, no results 456:2726, phones 456:3152; step 5.5). Table and cards read the
// same filtered list. Statuses come from the dates in India time; bidding always happens on the issuer's portal.
// Saved filters and alerts arrive with member accounts (step 7.3, A71).

export const metadata: Metadata = {
  title: "Hydrogen tenders in India · H2 India",
  description:
    "Open hydrogen tenders from SECI, public sector companies, state agencies and ports, with bid due dates.",
  alternates: { canonical: "/opportunities/tenders" },
};
export const dynamic = "force-dynamic";

const PER_PAGE = [20, 50];

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";
const day = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export default async function TendersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const forced = forcedState(one(params.view));
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {forced === "loading" ? (
        <Shell counts={null} params={params} signedIn={false}>
          <CardsLoading label="Loading tenders" />
        </Shell>
      ) : (
        <Suspense
          fallback={
            <Shell counts={null} params={params} signedIn={false}>
              <CardsLoading label="Loading tenders" />
            </Shell>
          }
        >
          <List params={params} forced={forced} />
        </Suspense>
      )}
    </main>
  );
}

function queryOf(params: Params, change: Record<string, string | null> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (k !== "view" && !(k in change)) for (const x of all(v)) q.append(k, x);
  for (const [k, v] of Object.entries(change)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

function Shell({
  counts,
  params,
  signedIn,
  children,
}: {
  counts: { open: number; week: number } | null;
  params: Params;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const view = one(params.as) === "cards" ? "cards" : "table";
  return (
    <>
      <div className={cx(wrap, "flex flex-col gap-3 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Opportunities", href: "/opportunities" }, { label: "Tenders" }]} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">Hydrogen tenders in India</h1>
            {counts ? (
              <p className="type-body text-body">
                {counts.open} open · {counts.week} closing this week
              </p>
            ) : null}
          </div>
          <Link
            href={memberHref(signedIn, "/member/alerts?type=tenders")}
            className={buttonClasses({ variant: "primary", size: "lg" })}
          >
            Create alert
          </Link>
        </div>
        <div className="hidden justify-end md:flex">
          <ViewToggle
            current={view}
            hrefFor={(v) =>
              `/opportunities/tenders${queryOf(params, { as: v === "cards" ? "cards" : null, page: null })}#list`
            }
          />
        </div>
      </div>
      <div id="list" className={cx(wrap, "scroll-mt-24 pb-16 pt-4")}>
        {children}
      </div>
    </>
  );
}

async function List({ params, forced }: { params: Params; forced: ReturnType<typeof forcedState> }) {
  const viewer = await siteViewer();
  const signedIn = Boolean(viewer);
  let tenders;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    tenders = await allTenders();
  } catch (error) {
    console.error("[tenders] list failed", error);
    return (
      <Shell counts={null} params={params} signedIn={signedIn}>
        <LoadError what="tenders" retry={`/opportunities/tenders${queryOf(params)}`} />
      </Shell>
    );
  }
  const now = new Date();
  const rows = tenders.map((t) => tenderRow(t, now));
  const open = rows.filter((r) => DEFAULT_TENDER_STATUSES.includes(r.status.label));
  const week = open.filter((r) => r.status.label === "Closing soon").length;

  const filter = {
    issuerTypes: all(params.issuerType),
    issuer: one(params.issuer),
    sectors: all(params.category),
    state: one(params.state),
    statuses: all(params.status).filter((s) => TENDER_STATUSES.includes(s)),
    from: day(one(params.from)),
    to: day(one(params.to)),
    values: all(params.value),
    q: one(params.q),
  };
  const sort = one(params.sort);
  let list = sortTenders(filterTenders(rows, filter), sort);
  if (forced === "empty") list = [];
  const perPage = PER_PAGE.includes(Number(one(params.perPage))) ? Number(one(params.perPage)) : (PER_PAGE[0] ?? 20);
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(one(params.page))) || 1));
  const shown = list.slice((page - 1) * perPage, page * perPage);
  const view = one(params.as) === "cards" ? "cards" : "table";
  const defaults = filter.statuses.length === 0;

  const groups: FilterGroupSpec[] = [
    {
      kind: "checks",
      name: "issuerType",
      title: "Issuer type",
      options: ISSUER_TYPES.map((v) => ({ value: v, label: v })),
    },
    {
      kind: "select",
      name: "issuer",
      title: "Issuer",
      placeholder: "Any issuer",
      options: [...new Set(rows.map((r) => r.issuer))].sort().map((v) => ({ value: v, label: v })),
    },
    {
      kind: "checks",
      name: "category",
      title: "Category",
      options: TENDER_CATEGORIES.map((v) => ({
        value: v,
        label: v === "Ammonia and methanol" ? "Ammonia and methanol supply" : v,
      })),
    },
    {
      kind: "select",
      name: "state",
      title: "State",
      placeholder: "All states and UTs",
      options: STATE_OPTIONS.filter((o) => o.value !== "all-india"),
    },
    {
      kind: "checks",
      name: "status",
      title: "Status",
      options: TENDER_STATUSES.map((v) => ({ value: v, label: v })),
      defaults: DEFAULT_TENDER_STATUSES,
    },
    { kind: "dates", title: "Bid due", from: "from", to: "to" },
    {
      kind: "checks",
      name: "value",
      title: "Value",
      options: [...VALUE_BANDS, NOT_PUBLISHED].map((v) => ({ value: v, label: v })),
    },
  ];
  const pageHref = (p: number) => `/opportunities/tenders${queryOf(params, { page: p > 1 ? String(p) : null })}#list`;

  return (
    <Shell counts={{ open: open.length, week }} params={params} signedIn={signedIn}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-60 lg:shrink-0">
          <ListFilters groups={groups} count={list.length} noun="tenders" />
        </div>
        <section aria-label="Tenders" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-label text-primary" role="status">
              {list.length} {list.length === 1 ? "tender" : "tenders"}
              {defaults ? " · open, closing soon or extended" : ""}
            </p>
            <SortBy
              options={[
                { value: "", label: "Bid due, soonest" },
                { value: "newest", label: "Newest first" },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <NoResults filter={filter} signedIn={signedIn} params={params} />
          ) : (
            <>
              <div className={cx(view === "table" ? "md:hidden" : "")}>
                <Cards rows={shown} />
              </div>
              {view === "table" ? (
                <div className="hidden md:block">
                  <Table rows={shown} />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="type-body-sm text-secondary">
                    Showing {(page - 1) * perPage + 1}–{Math.min(list.length, page * perPage)} of {list.length}
                  </p>
                  <PerPage value={perPage} options={PER_PAGE} />
                </div>
                {pages > 1 ? (
                  <nav aria-label="Pages" className="flex items-center gap-1">
                    {page > 1 ? (
                      <Link href={pageHref(page - 1)} scroll={false} className={pageLink(false)} rel="prev">
                        ‹<span className="sr-only">Previous page</span>
                      </Link>
                    ) : null}
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <Link
                        key={p}
                        href={pageHref(p)}
                        scroll={false}
                        aria-current={p === page ? "page" : undefined}
                        className={pageLink(p === page)}
                      >
                        {p}
                      </Link>
                    ))}
                    {page < pages ? (
                      <Link href={pageHref(page + 1)} scroll={false} className={pageLink(false)} rel="next">
                        ›<span className="sr-only">Next page</span>
                      </Link>
                    ) : null}
                  </nav>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}

const pageLink = (current: boolean) =>
  cx(
    "inline-flex size-8 items-center justify-center rounded-control type-label",
    current ? "bg-inverse text-inverse" : "border border-default text-primary hover:border-focus",
  );

function Cards({ rows }: { rows: TenderRow[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <li key={r.id}>
          <TenderCard {...r.card} />
        </li>
      ))}
    </ul>
  );
}

function Table({ rows }: { rows: TenderRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-default">
      <table className="w-full min-w-200 text-left">
        <thead className="bg-subtle type-label-sm text-secondary">
          <tr>
            {["Issuer", "Tender", "Category", "State", "Bid due", "Status"].map((h) => (
              <th key={h} scope="col" className="px-3 py-3 font-semibold">
                {h}
              </th>
            ))}
            <th scope="col" className="px-3 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        {rows.map((r) => (
          <tbody key={r.id} className="border-t border-default type-body-sm text-primary">
            <tr>
              <td className="px-3 py-3">
                <span className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm">
                    {r.initials}
                  </span>
                  <span className="type-label-sm">{r.issuer}</span>
                </span>
              </td>
              <td className="max-w-60 px-3 py-3">
                <Link href={r.href} className="type-label text-primary hover:underline">
                  {r.title}
                </Link>
                <p className="type-spec text-secondary">{r.tenderId}</p>
              </td>
              <td className="px-3 py-3">{r.sector ?? "—"}</td>
              <td className="px-3 py-3">{r.place}</td>
              <td className="px-3 py-3">
                <p className="type-spec whitespace-nowrap">{r.dueDate}</p>
                <DaysBadge left={r.left} />
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={r.status.label} tone={r.status.tone} />
              </td>
              <td className="px-3 py-3">
                <span className="flex items-center justify-end gap-1">
                  <Link
                    href={`${r.href}#track`}
                    className="inline-flex h-8 items-center rounded-pill border border-control px-3.25 type-label text-primary hover:border-focus"
                  >
                    Track<span className="sr-only"> {r.title}</span>
                  </Link>
                  <ExpandButton controls={`scope-${String(r.id)}`} label={r.title} />
                </span>
              </td>
            </tr>
            <tr id={`scope-${String(r.id)}`} hidden className="bg-subtle">
              <td />
              <td colSpan={3} className="px-3 pb-4">
                <p className="type-eyebrow text-secondary">Scope</p>
                <p className="type-body-sm text-body">{r.scope}</p>
              </td>
              <td colSpan={3} className="px-3 pb-4">
                <p className="type-eyebrow text-secondary">Key dates</p>
                <p className="type-body-sm text-body">{r.keyDates}</p>
                <Link href={r.href} className="type-label-sm text-link hover:underline">
                  View tender →<span className="sr-only"> {r.title}</span>
                </Link>
              </td>
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** No results (456:2726): what was asked for, a way out, and an alert for when one opens. */
function NoResults({
  filter,
  signedIn,
  params,
}: {
  filter: { sectors: string[]; state: string; values: string[] };
  signedIn: boolean;
  params: Params;
}) {
  const what = [
    filter.sectors.length === 1 ? (filter.sectors[0] ?? "").toLowerCase() : null,
    "tenders",
    filter.values.length === 1 && filter.values[0] !== NOT_PUBLISHED ? (filter.values[0] ?? "").toLowerCase() : null,
    filter.state ? `in ${stateLabel(filter.state)}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const keep = new URLSearchParams();
  for (const k of ["as", "sort"]) for (const v of all(params[k])) keep.append(k, v);
  const cleared = keep.toString();
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-subtle px-6 py-10 text-center">
      <h2 className="type-h4 text-primary">No open tenders match these filters</h2>
      <p className="max-w-120 type-body-sm text-body">
        There are no {what} right now. Create an alert and we’ll tell you when one opens.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={`/opportunities/tenders${cleared ? `?${cleared}` : ""}#list`}
          scroll={false}
          className={buttonClasses({ variant: "outline" })}
        >
          Clear filters
        </Link>
        <Link
          href={memberHref(signedIn, `/member/alerts?type=tenders`)}
          className={buttonClasses({ variant: "primary" })}
        >
          Create alert for these filters
        </Link>
      </div>
    </div>
  );
}
