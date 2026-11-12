import { getDb } from "@h2india/core";
import {
  cleanQuery,
  countMatches,
  logSearchMiss,
  SEARCH_INDEX_UIDS,
  searchIndex,
  type SearchHit,
} from "@h2india/core/search";
import { ArrowLink, Breadcrumbs, Button, buttonClasses, cx, EmptyState, Icon, OrgCard, Pagination } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { forcedState } from "@/lib/dev-state";
import { quoteHrefFor } from "@/search/present";

// Search results (step 5.2): Search 63:795 and 71:5194, states 127:6804 (no results), 127:6835 (loading) and 127:6870
// (error). The page lists Products and Suppliers as drawn; the header overlay covers news, schemes, tenders, events and
// knowledge. Products arrive with Stage 6: until then their tab shows its no-results state, and the filter panel, sort
// and grid/spec-table toggle (built on the category attribute schemas, step 6.1) are not shown. Never a price here.

export const metadata: Metadata = { title: "Search · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const wrap = "mx-auto w-full max-w-300 px-4 md:px-6 xl:px-0";
const PER_PAGE_OPTIONS = [6, 12, 24];
/** "6 per page" as drawn on 63:820. */
const DEFAULT_PER_PAGE = 6;

type Tab = "products" | "suppliers";

interface Params {
  q?: string;
  tab?: string;
  page?: string;
  perPage?: string;
  scope?: string;
  from?: string;
  state?: string;
}

const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = cleanQuery(params.q);
  const tab: Tab = params.tab === "suppliers" ? "suppliers" : "products";
  const forced = forcedState(params.state);

  return (
    <main id="main" className={cx(wrap, "flex flex-col pt-6 pb-16 md:pt-8 md:pb-24")}>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Search", href: "/search" },
          ...(q ? [{ label: `“${q}”` }] : []),
        ]}
        renderLink={(c, className) => (
          <Link href={c.href} className={className}>
            {c.label}
          </Link>
        )}
      />
      {q ? (
        <>
          <h1 className="mt-4 type-h1 text-primary md:mt-6">Results for “{q}”</h1>
          {forced === "loading" ? (
            <ResultsSkeleton />
          ) : (
            <Suspense key={`${q}|${tab}|${params.page ?? ""}|${params.perPage ?? ""}`} fallback={<ResultsSkeleton />}>
              <Results q={q} tab={tab} params={params} forced={forced} />
            </Suspense>
          )}
        </>
      ) : (
        <StartSearch />
      )}
    </main>
  );
}

/** /search with no words yet: a plain search form (also what works without JavaScript). */
function StartSearch() {
  return (
    <>
      <h1 className="mt-4 type-h1 text-primary md:mt-6">Search H2 India</h1>
      <p className="mt-2 type-body text-secondary">Find products, suppliers, news, schemes and tenders.</p>
      <form role="search" action="/search" className="mt-6 flex max-w-180 flex-col gap-3 md:flex-row">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-pill border border-input bg-page px-4 focus-within:field-focus">
          <Icon name="search" size={20} className="text-icon-primary" />
          <span className="sr-only">Search H2 India</span>
          <input
            type="search"
            name="q"
            required
            maxLength={200}
            placeholder="Search products, companies, news, schemes"
            className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
          />
        </label>
        <Button type="submit" size="lg">
          Search
        </Button>
      </form>
    </>
  );
}

async function Results({
  q,
  tab,
  params,
  forced,
}: {
  q: string;
  tab: Tab;
  params: Params;
  forced: ReturnType<typeof forcedState>;
}) {
  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage)) ? Number(params.perPage) : DEFAULT_PER_PAGE;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  let counts: Record<string, number>;
  let results: Awaited<ReturnType<typeof searchIndex>>;
  try {
    if (forced === "error") throw new Error("Forced error (?state=error)");
    counts = await countMatches(q, [...SEARCH_INDEX_UIDS]);
    results = await searchIndex(tab === "suppliers" ? "companies" : "products", q, { page, perPage });
  } catch (error) {
    console.error("[search] results failed", error);
    return <SearchError q={q} tab={tab} />;
  }
  if (forced === "empty") results = { hits: [], total: 0, page: 1, totalPages: 0 };

  // A finished search that found nothing anywhere goes to the Search management list (707:281, step 11.3).
  const anything = Object.values(counts).some((n) => n > 0);
  if (!anything && page === 1 && !forced) {
    await logSearchMiss(getDb(), {
      query: q,
      scope: params.scope ?? "all",
      source: params.from === "header" ? "header" : "page",
    }).catch((error: unknown) => {
      console.error("[search] could not log a search with no results", error);
    });
  }

  const products = counts.products ?? 0;
  const suppliers = counts.companies ?? 0;
  const query = { q, tab, perPage: String(perPage) };
  return (
    <>
      <p className="mt-2 type-body text-secondary">
        {plural(products, "product", "products")} and {plural(suppliers, "supplier", "suppliers")} match
      </p>
      <TabSwitch q={q} tab={tab} products={products} suppliers={suppliers} />
      <section aria-label={tab === "suppliers" ? "Suppliers" : "Products"} className="mt-6">
        {results.total === 0 ? (
          <NoResults q={q} tab={tab} />
        ) : tab === "suppliers" ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {(results.hits as SupplierHit[]).map((c) => (
              <li key={c.id} className="flex">
                <OrgCard
                  className="w-full"
                  name={c.title}
                  type={c.types?.[0]}
                  place={[c.city, c.state].filter(Boolean).join(", ")}
                  initials={c.initials ?? ""}
                  gstVerified={c.verified}
                  summary={c.categories?.length ? c.categories.join(", ") : c.summary}
                  href={c.href}
                  quoteHref={quoteHrefFor(q)}
                  renderLink={renderLink}
                />
              </li>
            ))}
          </ul>
        ) : (
          // Stage 6 replaces this list with the product card grid (63:814); the index holds no products until then.
          <ul className="flex flex-col gap-2">
            {results.hits.map((p) => (
              <li key={p.id}>
                <Link href={p.href} className="type-label text-primary hover:underline">
                  {p.title}
                </Link>
                <p className="type-caption text-secondary">{p.meta}</p>
              </li>
            ))}
          </ul>
        )}
        {results.total > 0 ? (
          <Pagination
            className="mt-6"
            page={results.page}
            perPage={perPage}
            total={results.total}
            perPageOptions={PER_PAGE_OPTIONS}
            query={query}
          />
        ) : null}
        {tab === "products" && results.total > 0 ? (
          <p className="mt-6 flex flex-wrap items-center gap-3 type-body text-body">
            Can’t find the exact model?
            <ArrowLink asChild>
              <Link href={quoteHrefFor(q)}>Send a pre-filled quote request</Link>
            </ArrowLink>
          </p>
        ) : null}
      </section>
    </>
  );
}

interface SupplierHit extends SearchHit {
  types?: string[];
  city?: string;
  state?: string;
  initials?: string;
  verified?: boolean;
  categories?: string[];
  summary?: string;
}

const renderLink = ({ href, className, children }: { href: string; className: string; children: ReactNode }) => (
  <Link href={href} className={className}>
    {children}
  </Link>
);

/** Products · 64 | Suppliers · 18 (segmented control 63:1088), as links so each tab has its own address. */
function TabSwitch({ q, tab, products, suppliers }: { q: string; tab: Tab; products: number; suppliers: number }) {
  const href = (t: Tab) => `/search?${new URLSearchParams(t === "suppliers" ? { q, tab: t } : { q }).toString()}`;
  const item = (t: Tab, label: string) => (
    <Link
      href={href(t)}
      aria-current={tab === t ? "page" : undefined}
      className={cx(
        "inline-flex h-9 items-center justify-center rounded-pill px-4 type-label whitespace-nowrap",
        tab === t ? "bg-page text-primary shadow-soft" : "text-body hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Result type" className="mt-6 inline-flex w-fit items-center gap-1 rounded-pill bg-subtle p-1">
      {item("products", `Products · ${fmt(products)}`)}
      {item("suppliers", `Suppliers · ${fmt(suppliers)}`)}
    </nav>
  );
}

function NoResults({ q, tab }: { q: string; tab: Tab }) {
  return (
    <div className="rounded-card border border-default bg-page py-10 md:py-16">
      <EmptyState
        kind="no-results"
        title={`No ${tab === "suppliers" ? "suppliers" : "products"} match “${q}”`}
        action={
          <Link href={quoteHrefFor(q)} className={buttonClasses({ variant: "primary", size: "md" })}>
            Request a quote
          </Link>
        }
      >
        Try fewer filters or a broader term, or send one quote request and let suppliers tell you what they can supply.
      </EmptyState>
    </div>
  );
}

function SearchError({ q, tab }: { q: string; tab: Tab }) {
  const again = `/search?${new URLSearchParams(tab === "suppliers" ? { q, tab } : { q }).toString()}`;
  return (
    <div className="mt-6 rounded-card border border-default bg-page py-10 md:py-16" role="alert">
      <EmptyState
        kind="error"
        title="We couldn’t load search results"
        action={
          <a href={again} className={buttonClasses({ variant: "outline", size: "md" })}>
            Try again
          </a>
        }
      >
        Check your connection and try again. If it keeps happening, contact support.
      </EmptyState>
    </div>
  );
}

/** Loading (127:6835): the count line, the tabs and six cards in the final layout. */
function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading results">
      <span className="mt-3 block h-4 w-64 rounded-[6px] shimmer" />
      <span className="mt-6 block h-11 w-64 rounded-pill shimmer" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-3.5"
          >
            <span className="block h-41.5 w-full rounded-control shimmer" />
            <span className="block h-2.5 w-2/5 rounded-[6px] shimmer" />
            <span className="block h-3 w-4/5 rounded-[6px] shimmer" />
            <span className="block h-2.5 w-1/2 rounded-[6px] shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
