import { ArrowLink, ArticleCard, cx, EmptyState, EventCard, Icon } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { EventView } from "@/home/data";
import { clock, shortName, type ArticleSummary, type Deadline, type SectionLink } from "./data";
import { eyebrow } from "./format";

export { eyebrow };

// Newsroom building blocks (step 5.3), shared by the news home (428:473), sections (430:1952), topic, tag and author
// pages (442:4049 to 444:5946), articles (434:2844) and Insights (440:40).

export const wrap = "mx-auto w-full max-w-300 px-4 md:px-6 xl:px-0";

const readLabel = (a: ArticleSummary) => `Read · ${String(a.minutes)} min`;

export function StoryCard({
  a,
  layout = "standard",
  className,
}: {
  a: ArticleSummary;
  layout?: "standard" | "hero" | "row" | "compact";
  className?: string;
}) {
  return (
    <ArticleCard
      layout={layout}
      section={eyebrow(a, { fullSection: layout === "hero" })}
      title={a.title}
      href={a.href}
      readLabel={readLabel(a)}
      badge={a.badge}
      excerpt={layout === "hero" ? a.dek : undefined}
      meta={layout === "hero" && a.authors.length ? `By ${a.authors.join(", ")}` : undefined}
      className={className}
    />
  );
}

/** Underlined section tabs (Tab item 21:185): Latest, the sections in order, Press releases. Scrolls on phones. */
export function SectionTabs({ sections, active }: { sections: SectionLink[]; active: string }) {
  const tabs = [
    { slug: "latest", name: "Latest", href: "/news" },
    ...sections,
    { slug: "press-releases", name: "Press releases", href: "/news/press-releases" },
  ];
  return (
    <nav aria-label="News sections" className="border-b border-default">
      <ul className={cx(wrap, "flex gap-1 overflow-x-auto [scrollbar-width:none]")}>
        {tabs.map((t) => {
          const on = t.slug === active;
          return (
            <li key={t.slug} className="shrink-0">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "flex items-center px-1 py-3 type-label whitespace-nowrap",
                  on ? "border-b-3 border-inverse text-primary" : "text-body hover:text-primary",
                )}
              >
                {t.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A panel with a border and a header row (Today, Closing this week, Most read). */
export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("flex flex-col rounded-card border border-default bg-page p-5", className)}>
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="type-h4 text-primary">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** "Today in Indian hydrogen" (428:680): the latest stories with their time in IST. */
export function TodayPanel({ items, today }: { items: ArticleSummary[]; today: string }) {
  return (
    <Panel
      title="Today in Indian hydrogen"
      aside={<span className="type-caption text-secondary">{today}</span>}
      className="pt-5 pb-4"
    >
      <ul className="flex flex-col">
        {items.map((a) => (
          <li key={a.id}>
            <ArticleCard
              layout="compact"
              section={`${clock(a.publishedAt)} IST · ${a.section ? shortName(a.section.name) : a.typeLabel}`}
              title={a.title}
              href={a.href}
              badge={a.badge}
            />
          </li>
        ))}
      </ul>
      <div className="pt-2">
        <ArrowLink asChild>
          <Link href="/news/latest">See all latest</Link>
        </ArrowLink>
      </div>
    </Panel>
  );
}

/** "Closing this week" (428:904): deadlines in the next seven days, from tenders, schemes and grants. */
export function ClosingPanel({ items, compact }: { items: Deadline[]; compact?: boolean }) {
  return (
    <Panel
      title="Closing this week"
      aside={
        <ArrowLink asChild>
          <Link href="/opportunities?closing=week">{compact ? "All" : "All opportunities"}</Link>
        </ArrowLink>
      }
    >
      {items.length ? (
        <ul className="flex flex-col">
          {items.map((d) => (
            <li key={d.href} className="flex items-center gap-3 border-b border-default py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-eyebrow text-secondary">{d.kind}</p>
                <Link href={d.href} className="type-label text-primary hover:text-link-hover hover:underline">
                  {d.title}
                </Link>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-warning px-2.5 py-1 type-label-sm text-warning">
                <Icon name="alert-triangle" size={14} />
                {d.daysLeft === 0 ? "Closes today" : `${String(d.daysLeft)} ${d.daysLeft === 1 ? "day" : "days"} left`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 type-body-sm text-secondary">Nothing closes in the next seven days.</p>
      )}
    </Panel>
  );
}

/**
 * "Most read this week" (428:950). Page-view counts need the analytics tool (M10); until it is chosen the list shows
 * the week's newest stories (A58).
 */
export function MostRead({ items }: { items: ArticleSummary[] }) {
  return (
    <Panel title="Most read this week">
      <ol className="flex flex-col">
        {items.map((a, i) => (
          <li key={a.id} className="flex items-start gap-4">
            <span className="type-h3 text-secondary" aria-hidden="true">
              {i + 1}
            </span>
            <ArticleCard
              layout="compact"
              className="min-w-0 flex-1"
              section={eyebrow(a)}
              title={a.title}
              href={a.href}
              badge={a.badge}
            />
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** A section heading with its "More in …" link. */
export function RailHeader({ title, link, id }: { title: string; link?: { label: string; href: string }; id: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="type-h2 text-primary">
        {title}
      </h2>
      {link ? (
        <ArrowLink asChild>
          <Link href={link.href}>{link.label}</Link>
        </ArrowLink>
      ) : null}
    </div>
  );
}

/** A rail of four cards (428:741); a swipe row on phones. */
export function Rail({
  title,
  link,
  items,
  id,
}: {
  title: string;
  link?: { label: string; href: string };
  items: ArticleSummary[];
  id: string;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className={cx(wrap, "flex flex-col gap-4 py-6 md:py-6")}>
      <RailHeader title={title} link={link} id={id} />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
        {items.map((a) => (
          <li key={a.id} className="w-72 shrink-0 snap-start md:w-auto">
            <StoryCard a={a} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Press releases (428:1236): supplied by companies, published as received. */
export function PressReleases({ items }: { items: ArticleSummary[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="press-releases" className={cx(wrap, "flex flex-col gap-4 py-12")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="press-releases" className="type-h2 text-primary">
            Press releases
          </h2>
          <p className="type-body-sm text-secondary">
            Supplied by companies and published as received. Not edited or verified by H2 India.
          </p>
        </div>
        <ArrowLink asChild>
          <Link href="/news/press-releases">All press releases</Link>
        </ArrowLink>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {items.map((a) => (
          <li key={a.id}>
            <StoryCard a={a} layout="row" className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UpcomingEvents({ items }: { items: EventView[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="upcoming-events" className={cx(wrap, "flex flex-col gap-4 py-12")}>
      <RailHeader id="upcoming-events" title="Upcoming events" link={{ label: "All events", href: "/events" }} />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {items.map((e) => (
          <li key={e.href}>
            <EventCard {...e} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Key facts box (424:7495). */
export function KeyFacts({
  facts,
  title = "Key facts",
}: {
  facts: { label: string; value: string }[];
  title?: string;
}) {
  if (!facts.length) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4 text-primary">{title}</h2>
      <dl className="flex flex-col gap-3">
        {facts.map((f) => (
          <div key={`${f.label}-${f.value}`} className="flex flex-col gap-0.5">
            <dt className="type-eyebrow text-secondary">{f.label}</dt>
            <dd className="type-body-sm text-primary">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Related stories (434:3289). */
export function RelatedStories({
  items,
  title = "Related stories",
  columns = 4,
}: {
  items: ArticleSummary[];
  title?: string;
  columns?: 3 | 4;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="related" className={cx(wrap, "flex flex-col gap-4 py-12")}>
      <h2 id="related" className="type-h2 text-primary">
        {title}
      </h2>
      <ul
        className={cx(
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0",
          columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        )}
      >
        {items.map((a) => (
          <li key={a.id} className="w-72 shrink-0 snap-start md:w-auto">
            <StoryCard a={a} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "No stories" for a list (431:2542), with a way back to everything. */
export function NoStories({ filtered, href }: { filtered: boolean; href: string }) {
  return (
    <div className="rounded-card border border-default bg-page py-8">
      <EmptyState
        kind={filtered ? "no-results" : "first-use"}
        icon="newspaper"
        title={filtered ? "No stories match these filters" : "No stories here yet"}
        action={
          filtered ? (
            <Link href={href} className="type-label text-link hover:underline">
              Clear filters
            </Link>
          ) : null
        }
      >
        {filtered
          ? "Try another state or content type."
          : "Stories appear here as soon as the newsroom publishes them."}
      </EmptyState>
    </div>
  );
}
