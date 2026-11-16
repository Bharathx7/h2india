import { cx, EmptyState, Pagination } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { showSample } from "@/cms/sample";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import { summarise } from "@/news/data";
import { dayMonthYear } from "@/news/format";
import { StoryCard } from "@/news/parts";
import { allTenders } from "@/opportunities/data";
import { QuerySelect } from "@/opportunities/filters";
import { Crumbs, LoadError, wrap } from "@/opportunities/parts";
import { resultRow, type ResultRow } from "@/opportunities/views";
import type { Article } from "@/payload-types";

// Tender results and awards (460:4147, step 5.5): winners and discovered prices from concluded tenders, linked to
// company profiles where they exist and to our analysis. Prices here are auction results the issuer published, not
// marketplace prices.

export const metadata: Metadata = {
  title: "Tender results & awards · H2 Economy",
  description: "Winners and discovered prices from concluded hydrogen tenders in India.",
  alternates: { canonical: "/opportunities/tenders/results" },
};
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  let tenders;
  try {
    tenders = await allTenders();
  } catch (error) {
    console.error("[tenders] results failed", error);
    return (
      <main id="main" className={cx(wrap, "py-10")}>
        <LoadError what="results" retry="/opportunities/tenders/results" />
      </main>
    );
  }
  const now = new Date();
  const awarded = tenders.filter((t) => t.result?.declaredAt && new Date(t.result.declaredAt) <= now);
  const rows = awarded
    .map(resultRow)
    .filter((r): r is ResultRow => r !== null)
    .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt));
  const issuer = one(params.issuer);
  const category = one(params.category);
  const year = one(params.year);
  const list = rows.filter(
    (r) => (!issuer || r.issuer === issuer) && (!category || r.sector === category) && (!year || r.year === year),
  );
  const shown = pageSlice(list, params.page);
  const analyses = [
    ...new Map(
      awarded
        .map((t) => t.result?.analysis)
        .filter(
          (a): a is Article =>
            typeof a === "object" && a !== null && a._status === "published" && (!a.sample || showSample()),
        )
        .map((a) => [a.id, a]),
    ).values(),
  ]
    .slice(0, 3)
    .map(summarise);
  const latest = awarded
    .map((t) => t.verification?.at)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);
  const options = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort().map((v) => ({ value: v, label: v }));

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Opportunities", href: "/opportunities" },
            { label: "Tenders", href: "/opportunities/tenders" },
            { label: "Results" },
          ]}
        />
        <h1 className="mt-2 type-h1 text-primary">Tender results &amp; awards</h1>
        <p className="type-body text-body">
          Winners and discovered prices from concluded hydrogen tenders, with links to company profiles and our
          analysis.
        </p>
      </div>
      <div id="list" className={cx(wrap, "flex scroll-mt-24 flex-col gap-4 py-8")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <QuerySelect
              name="issuer"
              label="Issuer"
              placeholder="All issuers"
              options={options(rows.map((r) => r.issuer))}
            />
            <QuerySelect
              name="category"
              label="Category"
              placeholder="All categories"
              options={options(rows.map((r) => r.sector))}
            />
            <QuerySelect
              name="year"
              label="Year"
              placeholder="All years"
              options={options(rows.map((r) => r.year)).reverse()}
            />
          </div>
          <p className="type-body-sm text-secondary" role="status">
            {list.length} {list.length === 1 ? "result" : "results"}
          </p>
        </div>
        {list.length ? (
          <div
            tabIndex={0}
            role="region"
            aria-label="Tender results"
            className="overflow-x-auto rounded-card border border-default"
          >
            <table className="w-full min-w-220 text-left">
              <thead className="bg-subtle type-label-sm text-secondary">
                <tr>
                  {["Result date", "Tender", "Bidders", "Winners", "Discovered price"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Analysis</span>
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-sm text-primary">
                {shown.items.map((r) => (
                  <tr key={r.id} className="border-t border-default">
                    <td className="px-4 py-3 type-spec whitespace-nowrap">{r.date}</td>
                    <td className="max-w-72 px-4 py-3">
                      <p className="type-eyebrow text-secondary">{r.eyebrow.toUpperCase()}</p>
                      <Link href={r.href} className="type-label text-primary hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.bidders}</td>
                    <td className="max-w-80 px-4 py-3">
                      <p className="type-label text-link">
                        {r.winnersLine ??
                          r.winners.map((w, i) => (
                            <span key={w.name}>
                              {i ? ", " : ""}
                              {w.href ? (
                                <Link href={w.href} className="hover:underline">
                                  {w.name}
                                </Link>
                              ) : (
                                w.name
                              )}
                            </span>
                          ))}
                      </p>
                      {r.capacity ? <p className="type-caption text-secondary">{r.capacity}</p> : null}
                    </td>
                    <td className="px-4 py-3 type-spec whitespace-nowrap">{r.price}</td>
                    <td className="px-4 py-3">
                      <Link href={r.meansHref} className="type-label-sm whitespace-nowrap text-link hover:underline">
                        What it means →<span className="sr-only"> for {r.title}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {shown.total > LIST_PER_PAGE ? (
          <Pagination
            page={shown.page}
            perPage={LIST_PER_PAGE}
            total={shown.total}
            perPageOptions={[LIST_PER_PAGE]}
            query={pagingQuery(params)}
          />
        ) : null}
        {list.length ? null : (
          <div className="rounded-card border border-default bg-page py-8">
            <EmptyState kind={rows.length ? "no-results" : "first-use"} icon="bar-chart" title="No results to show">
              {rows.length ? "Try another issuer, category or year." : "Results appear here once issuers declare them."}
            </EmptyState>
          </div>
        )}
        {rows.length ? (
          <p className="type-caption text-secondary">
            Sources: issuers’ auction and award notices. Prices are as discovered in e-reverse auctions; bidder counts
            are shown only where the issuer published them.
            {latest ? ` Last verified ${dayMonthYear(latest)}.` : ""}
          </p>
        ) : null}
      </div>
      {analyses.length ? (
        <section aria-labelledby="meaning" className={cx(wrap, "flex flex-col gap-4 pb-16")}>
          <h2 id="meaning" className="type-h2 text-primary">
            What the results mean
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {analyses.map((a) => (
              <li key={a.id}>
                <StoryCard a={a} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
