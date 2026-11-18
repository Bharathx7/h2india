import { getDb } from "@h2india/core";
import { popularPaths } from "@h2india/core/analytics";
import { ArrowLink, Breadcrumbs, buttonClasses, cx, EmptyState, Icon, Pagination } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LEVELS } from "@/cms/newsroom";
import { forcedState } from "@/lib/dev-state";
import { dayMonthYear, insightTopics, listInsights, type ArticleSummary } from "@/news/data";
import { FilterSelect, NewsBand } from "@/news/client";
import { StoryCard, wrap } from "@/news/parts";

// Insights (440:40; phones 440:596; states 127:6977 empty, 127:6995 loading, 127:7030 error, step 5.3, A55): guides,
// analysis and explainers, filtered by topic and reader level. "Popular this month" ranks by first-party page counts
// (A176, A58) and fills in with the newest pieces.

export const metadata: Metadata = {
  title: "Insights · H2 Economy",
  description: "Guides, analysis and market notes for people building India's hydrogen economy.",
  alternates: { canonical: "/knowledge/insights" },
};

const PER_PAGE = 6;

interface Params {
  topic?: string;
  level?: string;
  sort?: string;
  page?: string;
  state?: string;
}

const eyebrow = (a: ArticleSummary, featured = false) =>
  [featured ? "Featured" : null, a.typeLabel, a.level].filter(Boolean).join(" · ");

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const topics = await insightTopics();
  const topic = topics.some((t) => t.slug === params.topic) ? params.topic : undefined;
  const level = (LEVELS as readonly string[]).includes(params.level ?? "") ? params.level : undefined;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const forced = forcedState(params.state);
  const chip = (slug: string | undefined, label: string) => {
    const q = new URLSearchParams();
    if (slug) q.set("topic", slug);
    if (level) q.set("level", level);
    const on = slug === topic;
    return (
      <Link
        key={label}
        href={`/knowledge/insights${q.size ? `?${q.toString()}` : ""}`}
        aria-current={on ? "page" : undefined}
        className={cx(
          "inline-flex h-8 shrink-0 items-center rounded-pill border-[1.5px] px-2.75 type-label whitespace-nowrap",
          on ? "border-transparent bg-inverse text-inverse" : "border-control bg-page text-primary hover:border-focus",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-3 pt-6 pb-6 md:pt-8")}>
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Knowledge", href: "/knowledge" }, { label: "Insights" }]}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
        <h1 className="mt-2 type-h1 text-primary">Insights</h1>
        <p className="type-body text-secondary">
          Guides, analysis and market notes for people building India&apos;s hydrogen economy.
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav
            aria-label="Topics"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
          >
            {chip(undefined, "All topics")}
            {topics.map((t) => chip(t.slug, t.name))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="type-label-sm text-secondary" aria-hidden="true">
              Level
            </span>
            <FilterSelect
              name="level"
              label="Level"
              allLabel="All levels"
              options={LEVELS.map((l) => ({ value: l, label: l }))}
              className="w-44"
            />
          </div>
        </div>
      </div>
      {forced === "loading" ? (
        <Loading />
      ) : (
        <Suspense key={`${topic ?? ""}|${level ?? ""}|${sort}|${String(page)}`} fallback={<Loading />}>
          <Results topic={topic} level={level} sort={sort} page={page} forced={forced} />
        </Suspense>
      )}
      <NewsBand />
    </main>
  );
}

async function Results({
  topic,
  level,
  sort,
  page,
  forced,
}: {
  topic?: string;
  level?: string;
  sort: "newest" | "oldest";
  page: number;
  forced: ReturnType<typeof forcedState>;
}) {
  let list: Awaited<ReturnType<typeof listInsights>>;
  let latest: Awaited<ReturnType<typeof listInsights>>;
  try {
    if (forced === "error") throw new Error("Forced error (?state=error)");
    [list, latest] = await Promise.all([
      listInsights({ topic, level, sort, page, limit: PER_PAGE }),
      listInsights({ limit: 5 }),
    ]);
  } catch (error) {
    console.error("[insights] failed", error);
    return (
      <div className={cx(wrap, "py-8")}>
        <div className="rounded-card border border-default bg-page py-10" role="alert">
          <EmptyState
            kind="error"
            title="We couldn’t load articles"
            action={
              <Link href="/knowledge/insights" className={buttonClasses({ variant: "outline" })}>
                Try again
              </Link>
            }
          >
            Check your connection and try again. If it keeps happening, contact support.
          </EmptyState>
        </div>
      </div>
    );
  }
  if (forced === "empty") list = { items: [], total: 0, page: 1, totalPages: 0 };
  if (!list.items.length) {
    return (
      <div className={cx(wrap, "py-8")}>
        <div className="rounded-card border border-default bg-page py-10">
          <EmptyState
            kind="no-results"
            title="No insights match these filters"
            action={
              <Link href="/knowledge/insights" className={buttonClasses({ variant: "primary" })}>
                Show all articles
              </Link>
            }
          >
            Try another topic or level, or read the latest guides.
          </EmptyState>
        </div>
      </div>
    );
  }
  const filtered = Boolean(topic ?? level) || page > 1 || sort !== "newest";
  const featured = filtered ? null : (list.items[0] ?? null);
  // Popular this month (440:40): first-party page counts (A176, A58); the newest pieces fill in until there are views.
  const counts = await popularPaths(getDb(), { prefix: "/", days: 30, limit: 200 });
  const rank = new Map(counts.map((c, i) => [c.path, i]));
  const popular = latest.items
    .filter((a) => a.id !== featured?.id || a.kind !== featured.kind)
    .map((a, i) => ({ a, r: rank.get(a.href) ?? 1000 + i }))
    .sort((x, y) => x.r - y.r)
    .map((x) => x.a)
    .slice(0, 4);
  const query: Record<string, string> = {};
  if (topic) query.topic = topic;
  if (level) query.level = level;
  if (sort !== "newest") query.sort = sort;
  return (
    <>
      {featured ? (
        <section aria-label="Featured" className={cx(wrap, "flex flex-col gap-6 pb-8 lg:flex-row lg:items-start")}>
          <div className="min-w-0 flex-1">
            <FeaturedCard a={featured} />
          </div>
          <section
            aria-labelledby="popular"
            className="flex flex-col rounded-card border border-default bg-page p-5 lg:w-96 lg:shrink-0"
          >
            <h2 id="popular" className="pb-2 type-h4 text-primary">
              Popular this month
            </h2>
            <ul className="flex flex-col">
              {popular.map((a) => (
                <li
                  key={`${a.kind}-${String(a.id)}`}
                  className="flex flex-col gap-1 border-b border-default py-3 last:border-0"
                >
                  <p className="type-label-sm text-secondary">{eyebrow(a)}</p>
                  <Link href={a.href} className="type-label text-primary hover:text-link-hover hover:underline">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}
      <section aria-labelledby="latest-insights" className={cx(wrap, "flex flex-col gap-4 pb-12")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="latest-insights" className="type-h2 text-primary">
            Latest insights
          </h2>
          <div className="flex items-center gap-3">
            <span className="type-label-sm text-secondary" aria-hidden="true">
              Sort by
            </span>
            <FilterSelect
              name="sort"
              label="Sort by"
              allLabel="Newest"
              options={[{ value: "oldest", label: "Oldest" }]}
              className="w-36"
            />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {list.items.map((a) => (
            <li key={`${a.kind}-${String(a.id)}`}>
              <StoryCard a={a} className="h-full" />
            </li>
          ))}
        </ul>
        {list.total > PER_PAGE ? (
          <Pagination
            page={list.page}
            perPage={PER_PAGE}
            total={list.total}
            perPageOptions={[PER_PAGE]}
            query={query}
          />
        ) : null}
      </section>
    </>
  );
}

/** The featured piece (440:40): a large card with excerpt, byline and date. */
function FeaturedCard({ a }: { a: ArticleSummary }) {
  return (
    <article className="group card-lift relative flex flex-col overflow-hidden rounded-card border border-default bg-page">
      <div
        aria-hidden="true"
        className="flex h-50 w-full items-center justify-center bg-tint text-icon-primary md:h-75"
      >
        <Icon name="newspaper" size={52} />
      </div>
      <div className="flex flex-col gap-3 p-5 md:p-6">
        <p className="type-label-sm text-secondary">{eyebrow(a, true)}</p>
        <h2 className="type-h3 text-primary">{a.title}</h2>
        <p className="type-body text-body">{a.dek}</p>
        <p className="type-caption text-secondary">
          {a.authors.length ? `By ${a.authors.join(", ")} · ` : ""}
          {dayMonthYear(a.publishedAt)}
        </p>
        <ArrowLink asChild className="after:absolute after:inset-0 after:content-['']">
          <Link href={a.href}>
            Read · {a.minutes} min<span className="sr-only">: {a.title}</span>
          </Link>
        </ArrowLink>
      </div>
    </article>
  );
}

/** Loading (127:6995): six cards in the final layout. */
function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading insights"
      className={cx(wrap, "grid grid-cols-1 gap-4 pb-12 md:grid-cols-2 md:gap-6 lg:grid-cols-3")}
    >
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
  );
}
