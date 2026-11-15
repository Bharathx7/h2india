import { getDb } from "@h2india/core";
import { popularPaths } from "@h2india/core/analytics";
import { cx } from "@h2india/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { STATE_OPTIONS } from "@/cms/records/common";
import { loadEvents } from "@/home/data";
import { closingThisWeek, getSections, listArticles, weekdayDay, type ArticleSummary } from "@/news/data";
import { FilterSelect, NewsBand } from "@/news/client";
import {
  ClosingPanel,
  MostRead,
  NoStories,
  PressReleases,
  Rail,
  SectionTabs,
  StoryCard,
  TodayPanel,
  UpcomingEvents,
  wrap,
} from "@/news/parts";

// News home (428:473; phones 429:1287, step 5.3): the lead story and two more, Today in Indian hydrogen, a rail per
// section, Closing this week, Most read, press releases, the India H₂ Weekly band and upcoming events. The state
// filter narrows every list (national stories always show); choosing a topic opens its section.

export const metadata: Metadata = {
  title: "News · H2 India",
  description: "Indian hydrogen news, checked against the source: policy, projects, tenders, technology and mobility.",
  alternates: { canonical: "/news" },
};

/** The rails before the widgets, as drawn (Policy, Projects), then the rest. */
const RAILS_BEFORE_WIDGETS = 2;

export default async function NewsHome({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; topic?: string }>;
}) {
  const params = await searchParams;
  const state = STATE_OPTIONS.some((o) => o.value === params.state) ? params.state : undefined;
  if (params.topic) {
    redirect(`/news/${encodeURIComponent(params.topic)}${state ? `?state=${state}` : ""}`);
  }
  const sections = await getSections();
  const now = new Date();
  const [featured, latest, press, closing, events, ...rails] = await Promise.all([
    listArticles({ featured: true, notTypes: ["press_release", "sponsored"], state, limit: 1 }),
    listArticles({ notTypes: ["press_release"], state, limit: 10 }),
    listArticles({ types: ["press_release"], state, limit: 4 }),
    closingThisWeek(new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString()),
    loadEvents(now, 3),
    ...sections.map((s) => listArticles({ topic: s.slug, notTypes: ["press_release"], state, limit: 4 })),
  ]);
  const lead = featured.items[0] ?? latest.items[0];
  const secondary = latest.items.filter((a) => a.id !== lead?.id && a.type !== "sponsored").slice(0, 2);
  const today = latest.items.slice(0, 7);
  // Most read this week (428:950): first-party page counts (A176, A58); the newest stories until there are views.
  const popular = await popularPaths(getDb(), { prefix: "/news/", days: 7, limit: 20 });
  const pool = await listArticles({ notTypes: ["press_release"], state, limit: 60 });
  const read = popular
    .map((p) => pool.items.find((a) => a.href === p.path))
    .filter((a): a is ArticleSummary => Boolean(a));
  const mostRead = [...read, ...latest.items.filter((a) => !read.some((r) => r.id === a.id))].slice(0, 5);
  const sectionRails = sections.map((s, i) => ({ section: s, items: rails[i]?.items ?? [] }));
  const rail = ({ section, items }: { section: (typeof sections)[number]; items: ArticleSummary[] }) => (
    <Rail
      key={section.slug}
      id={`rail-${section.slug}`}
      title={section.name}
      link={{ label: `More in ${section.name}`, href: section.href }}
      items={items}
    />
  );

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-4 pt-8 pb-4 md:flex-row md:items-end md:justify-between")}>
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-primary">News</h1>
          <p className="type-body text-secondary">Indian hydrogen news, checked against the source. Times in IST.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <FilterSelect
            name="state"
            label="State"
            allLabel="All states"
            options={STATE_OPTIONS.filter((o) => o.value !== "all-india")}
            className="md:w-50"
          />
          <FilterSelect
            name="topic"
            label="Topic"
            allLabel="All topics"
            options={sections.map((s) => ({ value: s.slug, label: s.name }))}
            className="md:w-50"
          />
        </div>
      </div>
      <SectionTabs sections={sections} active="latest" />

      {!lead ? (
        <div className={cx(wrap, "py-12")}>
          <NoStories filtered={Boolean(state)} href="/news" />
        </div>
      ) : (
        <>
          <section aria-label="Top stories" className={cx(wrap, "flex flex-col gap-6 py-8 lg:flex-row")}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <StoryCard a={lead} layout="hero" />
              {secondary.length ? (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  {secondary.map((a) => (
                    <li key={a.id}>
                      <StoryCard a={a} className="h-full" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="lg:w-96 lg:shrink-0">
              <TodayPanel items={today} today={weekdayDay(now.toISOString())} />
            </div>
          </section>

          {sectionRails.slice(0, RAILS_BEFORE_WIDGETS).map(rail)}

          <section
            aria-label="This week"
            className={cx(wrap, "grid grid-cols-1 gap-6 py-6 lg:grid-cols-2 lg:items-start")}
          >
            <ClosingPanel items={closing} />
            <MostRead items={mostRead} />
          </section>

          {sectionRails.slice(RAILS_BEFORE_WIDGETS).map(rail)}
          <PressReleases items={press.items} />
        </>
      )}
      <NewsBand />
      <UpcomingEvents items={events} />
    </main>
  );
}
