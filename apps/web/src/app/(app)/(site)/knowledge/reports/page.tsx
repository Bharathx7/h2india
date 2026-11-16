import { cx, EmptyState, Pagination } from "@h2india/ui";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import type { Metadata } from "next";
import Link from "next/link";
import { allReports } from "@/knowledge/data";
import { AccessBadges, ReportCover, reportPages } from "@/knowledge/parts";
import { dayMonthYear } from "@/news/format";
import { QuerySelect } from "@/opportunities/filters";
import { Crumbs, wrap } from "@/opportunities/parts";
import { FreeOnly } from "@/knowledge/FreeOnly";
import type { Topic } from "@/payload-types";

// Reports (736:8, step 5.6): data notes, surveys and analysis. Most are free; some ask for a work email (A33).

export const metadata: Metadata = {
  title: "Reports · H2 India",
  description: "Data notes, surveys and analysis on India's hydrogen economy.",
  alternates: { canonical: "/knowledge/reports" },
};
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));
const yearOf = (iso: string) => String(new Date(iso).getFullYear());

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const reports = await allReports();
  const topicsOf = (r: (typeof reports)[number]) => (r.topics ?? []).filter((t): t is Topic => typeof t === "object");
  const topic = one(s.topic);
  const year = one(s.year);
  const free = one(s.free) === "1";
  const list = reports.filter(
    (r) =>
      (!topic || topicsOf(r).some((t) => t.slug === topic)) &&
      (!year || yearOf(r.publishedOn) === year) &&
      (!free || !r.gated),
  );
  const shown = pageSlice(list, s.page);

  const topics = [...new Map(reports.flatMap(topicsOf).map((t) => [t.slug, t])).values()];
  const years = [...new Set(reports.map((r) => yearOf(r.publishedOn)))].sort().reverse();
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Knowledge", href: "/knowledge" }, { label: "Reports" }]} />
        <h1 className="mt-2 type-h1 text-primary">Reports</h1>
        <p className="type-body text-body">
          Data notes, surveys and analysis on India&apos;s hydrogen economy. Most are free; some ask for your work
          email.
        </p>
      </div>
      <div id="list" className={cx(wrap, "flex scroll-mt-24 flex-col gap-4 pb-16 pt-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <QuerySelect
              name="topic"
              label="Topic"
              placeholder="All topics"
              options={topics.map((t) => ({ value: t.slug, label: t.name }))}
            />
            <QuerySelect
              name="year"
              label="Year"
              placeholder="All years"
              options={years.map((y) => ({ value: y, label: y }))}
            />
            <FreeOnly />
          </div>
          <p className="type-body-sm text-secondary" role="status">
            {list.length} {list.length === 1 ? "report" : "reports"}
          </p>
        </div>
        {list.length ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.items.map((r) => {
              const pages = reportPages(r);
              return (
                <li key={r.id}>
                  <Link
                    href={`/knowledge/reports/${r.slug}`}
                    className="flex h-full flex-col gap-3 rounded-card border border-default p-4 hover:border-focus"
                  >
                    <ReportCover report={r} />
                    <AccessBadges report={r} />
                    <span className="type-label text-primary">{r.title}</span>
                    <span className="type-caption text-secondary">
                      {[
                        dayMonthYear(r.publishedOn),
                        pages ? `${String(pages)} pages` : null,
                        r.sponsor?.name ? `Sponsored by ${r.sponsor.name}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              );
            })}
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
            <EmptyState
              kind={reports.length ? "no-results" : "first-use"}
              title={reports.length ? "No reports match" : "No reports yet"}
            >
              {reports.length ? "Try another topic or year." : "Our first data notes are on their way."}
            </EmptyState>
          </div>
        )}
      </div>
    </main>
  );
}
