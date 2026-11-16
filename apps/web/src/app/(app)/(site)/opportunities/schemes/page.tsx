import {
  Alert,
  ArrowLink,
  Breadcrumbs,
  Button,
  buttonClasses,
  cx,
  EmptyState,
  Pagination,
  SchemeCard,
} from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BENEFIT_TYPES } from "@/cms/records/eligibility";
import { STATE_OPTIONS } from "@/cms/records/common";
import { forcedState } from "@/lib/dev-state";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import { allSchemes, schemeView, stateLabel, type SchemeView } from "@/schemes/data";
import { ActiveFilters, SchemeFilters, SortSelect } from "@/schemes/filters";
import { wrap } from "@/news/parts";

// Schemes hub (411:9; phones 412:814, filters sheet 412:1379; states 421:2662 no results, 421:3306 loading, 421:4160
// couldn't load, step 5.4). Every scheme links to its official source; nobody applies on H2 Economy. Saving a scheme
// and alerts come with member accounts (Stage 7).

export const metadata: Metadata = {
  title: "Government schemes for hydrogen · H2 Economy",
  description:
    "Central and state schemes for hydrogen producers, manufacturers, start-ups and researchers, with deadlines and official sources.",
  alternates: { canonical: "/opportunities/schemes" },
};
export const dynamic = "force-dynamic";

/** "Closing soon" on the hub lists deadlines in the next 14 days, as drawn (411:9). */
const CLOSING_WINDOW_DAYS = 14;
const DAY = 86_400_000;
const STATUSES = ["Open", "Closing soon", "Announced", "Results declared", "Next round expected", "Closed"];

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";

export default async function SchemesHub({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  // ?state= is a real filter here, so the designed states are forced with ?view=loading|error|empty (step 2.5).
  const forced = forcedState(one(params.view));
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {forced === "loading" ? (
        <Loading />
      ) : (
        <Suspense fallback={<Loading />}>
          <Hub params={params} forced={forced} />
        </Suspense>
      )}
    </main>
  );
}

function Hero({ counts, q }: { counts: { open: number; closing: number; total: number } | null; q: string }) {
  return (
    <div className="bg-mint">
      <div className={cx(wrap, "flex flex-col gap-3 py-8 md:py-10")}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Opportunities", href: "/opportunities" },
            { label: "Schemes" },
          ]}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
        <h1 className="mt-2 type-h1 text-primary">Government schemes for hydrogen</h1>
        <p className="max-w-150 type-body text-body">
          Central and state schemes for hydrogen producers, manufacturers, start-ups and researchers, explained in plain
          language. Every scheme links to its official source and shows when we last checked it.
        </p>
        {counts ? (
          <p className="flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-secondary">
            <span>
              <strong className="type-label-lg text-primary">{counts.open}</strong> open now
            </span>
            <span>
              <strong className="type-label-lg text-primary">{counts.closing}</strong> closing in {CLOSING_WINDOW_DAYS}{" "}
              days
            </span>
            <span>
              <strong className="type-label-lg text-primary">{counts.total}</strong> central and state schemes
            </span>
          </p>
        ) : null}
        <form action="/opportunities/schemes" role="search" className="mt-2 flex max-w-150 flex-col gap-2 sm:flex-row">
          <label className="flex h-11.5 flex-1 items-center rounded-control border border-input bg-page px-4 focus-within:field-focus">
            <span className="sr-only">Search schemes</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="Search schemes, e.g. electrolyser, Odisha, start-up"
              className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
            />
          </label>
          <Button type="submit">Search</Button>
        </form>
      </div>
    </div>
  );
}

function Cards({ items }: { items: SchemeView[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      {items.map((s) => (
        <li key={s.id}>
          <SchemeCard {...s} />
        </li>
      ))}
    </ul>
  );
}

function Rail({
  id,
  title,
  sub,
  link,
  items,
}: {
  id: string;
  title: string;
  sub: string;
  link: { label: string; href: string };
  items: SchemeView[];
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className={cx(wrap, "flex flex-col gap-4 pt-10")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="type-h2 text-primary">
            {title}
          </h2>
          <p className="type-body-sm text-secondary">{sub}</p>
        </div>
        <ArrowLink asChild>
          <Link href={link.href}>{link.label}</Link>
        </ArrowLink>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.slice(0, 3).map((s) => (
          <li key={s.id}>
            <SchemeCard {...s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Disclaimer() {
  return (
    <Alert tone="info" title="Check the official source before you apply">
      H2 Economy summarises public scheme documents. Rules and dates can change; each scheme page links to the ministry
      or agency notice.
    </Alert>
  );
}

async function Hub({ params, forced }: { params: Params; forced: ReturnType<typeof forcedState> }) {
  const q = one(params.q).trim().toLowerCase();
  let schemes;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    schemes = await allSchemes();
  } catch (error) {
    console.error("[schemes] hub failed", error);
    return (
      <>
        <Hero counts={null} q={q} />
        <div className={cx(wrap, "py-10")}>
          <Alert tone="error" title="We couldn’t load schemes">
            Check your connection and try again. Your filters are kept.{" "}
            <a href={`/opportunities/schemes${queryOf(params)}`} className="type-label underline">
              Try again
            </a>
          </Alert>
        </div>
      </>
    );
  }
  const now = new Date();
  const views = schemes.map((s) => schemeView(s, now));
  const accepting = views.filter((v) => v.status.label === "Open" || v.status.label === "Closing soon");
  const soon = accepting
    .filter((v) => v.deadlineAt && new Date(v.deadlineAt).getTime() - now.getTime() <= CLOSING_WINDOW_DAYS * DAY)
    .sort((a, b) => (a.deadlineAt ?? "").localeCompare(b.deadlineAt ?? ""));
  const openNow = accepting.filter((v) => !soon.includes(v));

  // Filters (411:9).
  const level = one(params.level);
  const state = one(params.state);
  const agencies = all(params.agency);
  const who = all(params.who);
  const benefits = all(params.benefit);
  const statuses = all(params.status);
  const sort = one(params.sort);
  const byId = new Map(schemes.map((s) => [s.id, s]));
  let list = views.filter((v) => {
    if (level === "central" && !v.central) return false;
    if (level === "state" && v.central) return false;
    if (state && !v.central && !v.states.includes(state)) return false;
    if (agencies.length && !v.agencies.some((a) => agencies.includes(a))) return false;
    if (who.length && !v.who.some((w) => who.includes(w))) return false;
    if (benefits.length && !v.benefitTypes.some((b) => benefits.includes(b))) return false;
    if (statuses.length && !statuses.includes(v.status.label)) return false;
    if (q) {
      const s = byId.get(v.id);
      const text = [v.title, v.benefit, v.level, s?.purpose, ...v.who, ...v.states.map(stateLabel)]
        .join(" ")
        .toLowerCase();
      if (!q.split(/\s+/).every((w) => text.includes(w))) return false;
    }
    return true;
  });
  list = [...list].sort((a, b) => {
    if (sort === "name") return a.title.localeCompare(b.title);
    if (sort === "verified")
      return (byId.get(b.id)?.verification?.at ?? "").localeCompare(byId.get(a.id)?.verification?.at ?? "");
    return (a.deadlineAt ?? "9999").localeCompare(b.deadlineAt ?? "9999");
  });
  if (forced === "empty") list = [];
  const shown = pageSlice(list, params.page);
  const chips = [
    ...(q ? [{ name: "q", value: q, label: `Search: ${q}` }] : []),
    ...(level ? [{ name: "level", value: level, label: `Level: ${level === "central" ? "Central" : "State"}` }] : []),
    ...(state ? [{ name: "state", value: state, label: `State: ${stateLabel(state)}` }] : []),
    ...agencies.map((a) => ({ name: "agency", value: a, label: `Agency: ${a}` })),
    ...who.map((w) => ({ name: "who", value: w, label: `Who can apply: ${w}` })),
    ...benefits.map((b) => ({ name: "benefit", value: b, label: `Benefit type: ${b}` })),
    ...statuses.map((s) => ({ name: "status", value: s, label: `Status: ${s}` })),
  ];
  const options = {
    agencies: [...new Set(schemes.flatMap((s) => [s.ministry, s.runBy]).filter((x): x is string => Boolean(x)))].sort(),
    states: STATE_OPTIONS.filter((o) => o.value !== "all-india"),
    who: [...new Set(schemes.flatMap((s) => s.whoCanApply ?? []))],
    benefits: BENEFIT_TYPES,
    statuses: STATUSES.filter((s) => views.some((v) => v.status.label === s)),
  };

  return (
    <>
      <Hero counts={{ open: accepting.length, closing: soon.length, total: views.length }} q={q} />
      <Rail
        id="open-now"
        title="Open now"
        sub="Accepting applications or bids today"
        link={{
          label: `See all ${String(accepting.length)} open`,
          href: "/opportunities/schemes?status=Open&status=Closing+soon#all",
        }}
        items={openNow.length ? openNow : accepting}
      />
      <Rail
        id="closing-soon"
        title="Closing soon"
        sub={`Deadlines in the next ${String(CLOSING_WINDOW_DAYS)} days`}
        link={{
          label: `See all ${String(soon.length)} closing soon`,
          href: "/opportunities/schemes?status=Closing+soon#all",
        }}
        items={soon}
      />
      <div id="all" className={cx(wrap, "flex scroll-mt-24 flex-col gap-8 py-12 lg:flex-row lg:items-start")}>
        <div className="lg:w-60 lg:shrink-0">
          <SchemeFilters options={options} count={list.length} total={views.length} />
        </div>
        <section aria-labelledby="all-schemes" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="all-schemes" className="type-h2 text-primary">
                All schemes
              </h2>
              <p className="type-body-sm text-secondary">
                {list.length} of {views.length} schemes match
              </p>
            </div>
            <SortSelect />
          </div>
          <ActiveFilters chips={chips} />
          {list.length ? (
            <>
              <Cards items={shown.items} />
              {shown.total > LIST_PER_PAGE ? (
                <Pagination
                  page={shown.page}
                  perPage={LIST_PER_PAGE}
                  total={shown.total}
                  perPageOptions={[LIST_PER_PAGE]}
                  query={pagingQuery(params)}
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-card border border-default bg-page py-8">
              <EmptyState
                kind="no-results"
                title="No schemes match these filters"
                action={
                  <Link href="/opportunities/schemes#all" className={buttonClasses({ variant: "outline" })}>
                    Clear all filters
                  </Link>
                }
              >
                Try removing a filter.
              </EmptyState>
            </div>
          )}
          <Disclaimer />
        </section>
      </div>
    </>
  );
}

function queryOf(params: Params): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const x of all(v)) if (k !== "view") q.append(k, x);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Loading (421:3306): the hero, then cards in the final layout. */
function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading schemes">
      <Hero counts={null} q="" />
      <div className={cx(wrap, "grid grid-cols-1 gap-4 py-10 md:grid-cols-2 md:gap-6 lg:grid-cols-3")}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
          >
            <span className="block h-3 w-2/5 rounded-[6px] shimmer" />
            <span className="block h-4 w-4/5 rounded-[6px] shimmer" />
            <span className="block h-3 w-3/5 rounded-[6px] shimmer" />
            <span className="block h-8 w-1/2 rounded-pill shimmer" />
            <span className="block h-3 w-2/5 rounded-[6px] shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
