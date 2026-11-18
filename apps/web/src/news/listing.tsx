import { Breadcrumbs, cx, Pagination } from "@h2india/ui";
import Link from "next/link";
import { STATE_OPTIONS } from "@/cms/records/common";
import { ARTICLE_TYPES } from "@/cms/types";
import {
  clock,
  closingThisWeek,
  getSections,
  istDayKey,
  listArticles,
  shortName,
  weekdayDay,
  type ArticleFilter,
  type ArticleSummary,
} from "./data";
import { FilterSelect, WeeklyBox } from "./client";
import { ClosingPanel, NoStories, SectionTabs, StoryCard, wrap } from "./parts";
import { ArticleCard } from "@h2india/ui";

// A news section (Tenders & awards 430:1952; phones 431:2334; no stories for the filters 431:2542), also used for
// "Latest" and "Press releases": the lead story, filters, the list grouped by day in IST, and the side column.

export const PER_PAGE = 20;

export interface ListingParams {
  state?: string;
  type?: string;
  page?: string;
}

const crumbs = (label: string) => [{ label: "Home", href: "/" }, { label: "News", href: "/news" }, { label }];

/** The row eyebrow in a dated list: "TENDERS · 17:45 IST", or "PRESS RELEASE · NARMADA COMPRESSION WORKS". */
function rowEyebrow(a: ArticleSummary): string {
  if (a.type === "press_release") return `Press release${a.issuer ? ` · ${a.issuer}` : ""}`;
  const what = a.type === "news" ? (a.section ? shortName(a.section.name) : "News") : a.typeLabel;
  return `${what} · ${clock(a.publishedAt)} IST`;
}

export async function NewsListing({
  slug,
  title,
  description,
  filter,
  params,
}: {
  /** The tab: a section slug, "latest" or "press-releases". */
  slug: string;
  title: string;
  description: string | null;
  filter: ArticleFilter;
  params: ListingParams;
}) {
  const state = STATE_OPTIONS.some((o) => o.value === params.state) ? params.state : undefined;
  const type = ARTICLE_TYPES.some((t) => t.value === params.type) ? params.type : undefined;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const filtered = Boolean(state ?? type);
  const now = new Date();
  const [sections, lead, list, closing] = await Promise.all([
    getSections(),
    page === 1 && !filtered ? listArticles({ ...filter, limit: 1 }) : null,
    listArticles({
      ...filter,
      state,
      types: type ? [type] : filter.types,
      exclude: [],
      page,
      limit: PER_PAGE,
    }),
    closingThisWeek(new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString()),
  ]);
  const leadStory = lead?.items[0] ?? null;
  const items = list.items.filter((a) => a.id !== leadStory?.id);
  const days = new Map<string, ArticleSummary[]>();
  for (const a of items) {
    const key = istDayKey(a.publishedAt);
    days.set(key, [...(days.get(key) ?? []), a]);
  }
  const todayKey = istDayKey(now.toISOString());
  const query: Record<string, string> = {};
  if (state) query.state = state;
  if (type) query.type = type;

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 pb-4 md:pt-8")}>
        <Breadcrumbs
          items={crumbs(title)}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
        <h1 className="mt-2 type-h1 text-primary">{title}</h1>
        {description ? <p className="max-w-180 type-body text-secondary">{description}</p> : null}
      </div>
      <SectionTabs sections={sections} active={slug} />
      <div className={cx(wrap, "flex flex-col gap-8 py-8 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {leadStory ? <StoryCard a={leadStory} layout="hero" /> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FilterSelect
              name="state"
              label="State"
              allLabel="All states"
              options={STATE_OPTIONS.filter((o) => o.value !== "all-india")}
            />
            {slug === "press-releases" ? null : (
              <FilterSelect
                name="type"
                label="Content type"
                allLabel="All content types"
                options={ARTICLE_TYPES.filter((t) => t.value !== "press_release").map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
              />
            )}
          </div>
          {items.length === 0 && !leadStory ? (
            <NoStories filtered={filtered} href={`/news/${slug}`} />
          ) : (
            <div className="flex flex-col gap-6">
              {[...days.entries()].map(([day, stories]) => (
                <section key={day} aria-label={weekdayDay(`${day}T12:00:00+05:30`)} className="flex flex-col gap-3">
                  <h2 className="border-b border-default pb-2 type-label-sm text-secondary">
                    {day === todayKey ? "Today · " : ""}
                    {weekdayDay(`${day}T12:00:00+05:30`)}
                  </h2>
                  <ul className="flex flex-col gap-3">
                    {stories.map((a) => (
                      <li key={a.id}>
                        <ArticleCard
                          layout="row"
                          section={rowEyebrow(a)}
                          title={a.title}
                          href={a.href}
                          badge={a.badge}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {list.total > PER_PAGE ? (
                <Pagination
                  page={list.page}
                  perPage={PER_PAGE}
                  total={list.total}
                  perPageOptions={[PER_PAGE]}
                  query={query}
                />
              ) : null}
            </div>
          )}
        </div>
        <aside aria-label="More" className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <ClosingPanel items={closing} compact />
          <WeeklyBox />
        </aside>
      </div>
    </main>
  );
}
