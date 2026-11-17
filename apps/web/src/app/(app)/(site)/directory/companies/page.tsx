import { directorySearch, filterDirectory, parseDirectory, typeLabel } from "@h2india/core/directory/rules";
import { buttonClasses, cx, EmptyState, Icon, MapView, stateBubbles, OrgCard, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { companies } from "@/directory/data";
import { DirectoryFilters } from "@/directory/DirectoryFilters";
import { forcedState } from "@/lib/dev-state";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";
import { needsMembership } from "@/directory/gate";
import { MembersOnly } from "@/directory/MembersOnly";

// The company directory (477:40; phones 480:8; map view 478:708; empty 128:23393, loading 128:23411, error 128:23436),
// step 6.6. List and map read the same filtered companies, so they always agree. The map is the state-bubble stand-in (A176) with its list by state
// until the tiles vendor is chosen (M7, A76).
export const metadata: Metadata = {
  title: "Hydrogen directory · H2 Economy",
  description:
    "Organisations across India's hydrogen value chain: manufacturers, suppliers, EPC firms, developers, labs, start-ups and research institutes.",
  alternates: { canonical: "/directory/companies" },
};
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function DirectoryPage({ searchParams }: { searchParams: Search }) {
  // Founder QC (17 Nov 2026): Directory browsing is for members; buyers and suppliers join first.
  if (await needsMembership()) return <MembersOnly />;
  const params = await searchParams;
  const forced = forcedState(
    params.state === "loading" || params.state === "error" || params.state === "empty" ? params.state : undefined,
  );
  const query = parseDirectory(forced ? { ...params, state: undefined } : params);
  const everyone = await companies();
  const result = filterDirectory(everyone, query);
  const n = (c: number) => c.toLocaleString("en-IN");
  const href = (change: Parameters<typeof directorySearch>[1]) =>
    `/directory/companies${directorySearch(query, change)}`;
  const pages = Math.max(1, Math.ceil(result.total / query.perPage));
  const link = ({ href: h, className, children }: { href: string; className: string; children: React.ReactNode }) => (
    <Link href={h} className={className}>
      {children}
    </Link>
  );

  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16 [&_:is(h1,h2,h3)]:text-wrap")}>
      <Crumbs items={[{ label: "Directory" }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-180 flex-col gap-2">
          <h1 className="type-h1 text-primary">Hydrogen directory</h1>
          <p className="type-body text-body">
            {n(everyone.length)} organisations across India&apos;s hydrogen value chain: manufacturers, suppliers, EPC
            firms, developers, labs, start-ups and research institutes. Badges show what H2 Economy has checked.
          </p>
        </div>
        <Link
          href="/verification"
          className="inline-flex items-center gap-1.5 type-label text-link hover:text-link-hover"
        >
          How verification works
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
      <form method="get" role="search" className="flex flex-wrap items-center gap-3">
        {query.type ? <input type="hidden" name="type" value={query.type} /> : null}
        <label className="flex h-11 min-w-60 flex-1 items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3">
          <Icon name="search" size={18} className="text-icon-secondary" />
          <span className="sr-only">Search organisations</span>
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Search organisations, products or technologies"
            className="min-w-0 flex-1 bg-transparent type-body outline-none"
          />
        </label>
        <select
          name="sort"
          defaultValue={query.sort}
          aria-label="Sort"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
        <button type="submit" className={buttonClasses({ variant: "secondary" })}>
          Search
        </button>
        <nav aria-label="View" className="flex rounded-pill bg-subtle p-1">
          {(["list", "map"] as const).map((v) => (
            <Link
              key={v}
              href={href({ view: v, page: 1 })}
              aria-current={query.view === v ? "page" : undefined}
              className={cx(
                "rounded-pill px-4 py-1.5 type-label",
                query.view === v ? "bg-page text-primary shadow-soft" : "text-secondary",
              )}
            >
              {v === "list" ? "List" : "Map"}
            </Link>
          ))}
        </nav>
      </form>
      <nav aria-label="Organisation types" className="flex gap-5 overflow-x-auto border-b border-default">
        {[{ key: "", label: "All" } as const, ...result.facets.types].map((t) => (
          <Link
            key={t.key}
            href={href({ type: t.key, page: 1 })}
            aria-current={query.type === t.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label whitespace-nowrap",
              query.type === t.key
                ? "border-inverse text-primary"
                : "border-transparent text-secondary hover:text-primary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="max-lg:hidden">
          <DirectoryFilters query={query} facets={result.facets} />
        </div>
        <LiveSection
          label="Organisations"
          state={forced ?? (result.total ? "ready" : "empty")}
          skeleton={
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} kind="card" />
              ))}
            </div>
          }
          empty={
            <div className="rounded-card border border-default bg-subtle">
              <EmptyState
                kind="no-results"
                title="No organisations match"
                action={
                  <Link href="/directory/companies" className={buttonClasses({})}>
                    Clear filters
                  </Link>
                }
              >
                Try fewer filters, or list your company so buyers can find you.
              </EmptyState>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="flex justify-between type-caption text-secondary">
              <span className="type-label text-primary">{n(result.total)} organisations</span>
              <span>Verified organisations are shown first</span>
            </p>
            {query.view === "map" ? (
              <MapView
                provider={stateBubbles}
                label="Organisations on the map"
                points={result.all.map((e) => ({
                  id: e.id,
                  label: e.name,
                  href: e.href,
                  group: e.state || "State not given",
                  detail: typeLabel(e),
                }))}
                renderLink={link}
              />
            ) : (
              <>
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {result.items.map((e) => (
                    <li key={e.id} className="flex">
                      <OrgCard
                        className="w-full"
                        name={e.name}
                        type={typeLabel(e)}
                        place={[e.city, e.state].filter(Boolean).join(", ")}
                        initials={e.initials}
                        gstVerified={e.verified}
                        summary={[
                          e.categories.slice(0, 3).join(", ") || e.summary,
                          e.claimStatus === "Unclaimed" ? "Profile not claimed yet" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        href={e.href}
                        quoteHref={`/rfq/new?supplier=${e.href.split("/").at(-1) ?? ""}`}
                        renderLink={link}
                      />
                    </li>
                  ))}
                </ul>
                {pages > 1 ? (
                  <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
                    <p className="type-body-sm text-secondary">
                      Showing {n((query.page - 1) * query.perPage + 1)}–
                      {n(Math.min(result.total, query.page * query.perPage))} of {n(result.total)}
                    </p>
                    <ol className="flex flex-wrap gap-1">
                      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                        <li key={p}>
                          <Link
                            href={href({ page: p })}
                            aria-current={p === query.page ? "page" : undefined}
                            className={cx(
                              "inline-flex size-9 items-center justify-center rounded-control type-label",
                              p === query.page ? "bg-inverse text-inverse" : "border border-default",
                            )}
                          >
                            {p}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </LiveSection>
      </div>
    </main>
  );
}
