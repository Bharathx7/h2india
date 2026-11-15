import { ArrowLink, Button, buttonClasses, cx, Icon, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { allChapters, allGuides, allReports, allStandards, allTerms, allVideos, termOfTheDay } from "@/knowledge/data";
import { listInsights } from "@/news/data";
import { NewsBand } from "@/news/client";
import { StoryCard } from "@/news/parts";
import { Crumbs, wrap } from "@/opportunities/parts";
import { trackerOverview } from "@/tracker/data";
import { siteViewer } from "@/server/site";

// Knowledge home (470:1391; phones 473:2607, step 5.6): search, Hydrogen 101, buyer's guides, latest insights, the
// glossary, the standards library, tracker headline figures and reports and videos. Every figure carries its source.

export const metadata: Metadata = {
  title: "Learn India's hydrogen economy · H2 India",
  description: "Courses, buyer's guides, a glossary and the standards that apply in India.",
  alternates: { canonical: "/knowledge" },
};
export const dynamic = "force-dynamic";

const POPULAR = ["Hydrogen 101", "Electrolysers", "PESO approvals", "SIGHT", "LCOH"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** An icon per guide, by the words in its title (the drawn tiles carry a category icon). */
function guideIcon(title: string): IconName {
  const t = title.toLowerCase();
  if (t.includes("fuel cell")) return "activity";
  if (t.includes("compressor")) return "arrow-up-down";
  if (t.includes("storage") || t.includes("cylinder")) return "package";
  if (t.includes("refuel")) return "map-pin";
  if (t.includes("sensor") || t.includes("leak")) return "alert-triangle";
  return "zap";
}

function Head({ id, title, link }: { id: string; title: string; link?: { label: string; href: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="type-h2 text-primary">
        {title}
      </h2>
      {link ? (
        <ArrowLink asChild className="type-label-sm">
          <Link href={link.href}>{link.label}</Link>
        </ArrowLink>
      ) : null}
    </div>
  );
}

function Block({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  link?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cx(wrap, "flex flex-col gap-4 pt-12")}>
      <Head id={id} title={title} link={link} />
      {children}
    </section>
  );
}

export default async function KnowledgeHome() {
  const [chapters, guides, insights, terms, standards, reports, videos, overview, viewer] = await Promise.all([
    allChapters(),
    allGuides(),
    listInsights({ limit: 3 }),
    allTerms(),
    allStandards(),
    allReports(),
    allVideos(),
    trackerOverview(),
    siteViewer(),
  ]);
  const buyers = guides.filter((g) => (g.productCategories ?? []).length > 0);
  const minutes = chapters.reduce((n, c) => n + (c.readingMinutes ?? 0), 0);
  const today = termOfTheDay(terms);
  const letters = new Set(terms.map((t) => t.term.charAt(0).toUpperCase()));
  const first = chapters[0];
  const media = [
    ...reports.slice(0, 2).map((r) => ({
      eyebrow: `REPORT · ${(r.kicker ?? "Report").toUpperCase()}`,
      title: r.title,
      text: r.summary,
      href: `/knowledge/reports/${r.slug}`,
    })),
    ...videos.slice(0, 1).map((v) => ({
      eyebrow: `VIDEO${v.durationMinutes ? ` · ${String(v.durationMinutes)} MIN` : ""}`,
      title: v.title,
      text: v.description,
      href: `/knowledge/media/videos/${v.slug}`,
    })),
  ];

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-4 py-10")}>
          <Crumbs items={[{ label: "Knowledge" }]} />
          <h1 className="type-h1 text-primary">Learn India&apos;s hydrogen economy</h1>
          <p className="max-w-150 type-body text-body">
            Courses, buyer&apos;s guides, a glossary and the standards that apply in India. Written for engineers,
            buyers, students and policy teams.
          </p>
          <form action="/search" role="search" className="flex max-w-150 flex-col gap-2 sm:flex-row">
            <label className="flex h-11.5 flex-1 items-center gap-2 rounded-control border border-input bg-page px-4 focus-within:field-focus">
              <Icon name="search" size={18} className="text-icon-secondary" />
              <span className="sr-only">Search guides, terms and standards</span>
              <input
                type="search"
                name="q"
                maxLength={100}
                placeholder="Search guides, terms and standards"
                className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
              />
            </label>
            <Button type="submit">Search</Button>
          </form>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            Popular:
            {POPULAR.map((p) => (
              <Link
                key={p}
                href={p === "Hydrogen 101" ? "/knowledge/hydrogen-101" : `/search?q=${encodeURIComponent(p)}`}
                className="inline-flex h-7 items-center rounded-pill border border-control bg-page px-2.5 type-label-sm text-primary hover:border-focus"
              >
                {p}
              </Link>
            ))}
          </p>
        </div>
      </div>

      {chapters.length ? (
        <Block id="start" title="Start here">
          <div className="grid grid-cols-1 gap-6 rounded-card border border-default p-5 md:grid-cols-[22rem_1fr]">
            <div className="flex flex-col gap-3">
              <p className="type-eyebrow text-secondary">
                FREE COURSE · {chapters.length} CHAPTERS{minutes ? ` · ABOUT ${String(minutes)} MINUTES` : ""}
              </p>
              <h3 className="type-h3 text-primary">Hydrogen 101</h3>
              <p className="type-body-sm text-body">
                From what hydrogen is to how India&apos;s mission, states and companies fit together. No background
                needed.
              </p>
              {viewer ? null : <p className="type-caption text-secondary">Sign in to save your progress</p>}
              <div className="flex items-center gap-3">
                {first ? (
                  <Link href={`/knowledge/hydrogen-101/${first.slug}`} className={buttonClasses({ size: "sm" })}>
                    Start chapter 1
                  </Link>
                ) : null}
                {viewer ? null : (
                  <Link href="/sign-in?next=/knowledge" className="type-label-sm text-link hover:underline">
                    Sign in
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <ol className="flex flex-col">
                {chapters.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-default py-2.5 last:border-b-0">
                    <span className="w-6 type-spec text-secondary">{String(c.order).padStart(2, "0")}</span>
                    <Link
                      href={`/knowledge/hydrogen-101/${c.slug}`}
                      className="flex-1 type-label text-primary hover:underline"
                    >
                      {c.title}
                    </Link>
                    {c.readingMinutes ? (
                      <span className="type-caption text-secondary">{c.readingMinutes} min</span>
                    ) : null}
                  </li>
                ))}
              </ol>
              <ArrowLink asChild className="mt-3 self-center type-label-sm">
                <Link href="/knowledge/hydrogen-101">All {chapters.length} chapters</Link>
              </ArrowLink>
            </div>
          </div>
        </Block>
      ) : null}

      {buyers.length ? (
        <Block
          id="guides"
          title="Buyer's guides"
          link={{ label: `All ${String(buyers.length)} guides`, href: "/knowledge/guides" }}
        >
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {buyers.slice(0, 8).map((g) => (
              <li key={g.id}>
                <Link
                  href={`/knowledge/guides/${g.slug}`}
                  className="flex h-full flex-col gap-3 rounded-card border border-default p-4 hover:border-focus"
                >
                  <span className="flex size-9 items-center justify-center rounded-control bg-mint text-icon-primary">
                    <Icon name={guideIcon(g.title)} size={18} />
                  </span>
                  <span className="flex items-end justify-between gap-2">
                    <span className="flex flex-col">
                      <span className="type-label text-primary">{g.title.split(":")[0]}</span>
                      <span className="type-caption text-secondary">Guide · {g.level ?? "Professional"}</span>
                    </span>
                    <Icon name="arrow-right" size={16} className="text-icon-primary" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {insights.items.length ? (
        <Block id="insights" title="Latest insights" link={{ label: "All insights", href: "/knowledge/insights" }}>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {insights.items.map((a) => (
              <li key={`${a.kind}-${String(a.id)}`}>
                <StoryCard a={a} className="h-full" />
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {terms.length ? (
        <Block id="glossary" title="Glossary" link={{ label: "Open the glossary", href: "/knowledge/glossary" }}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_20rem] md:items-start">
            <nav aria-label="Glossary letters" className="flex flex-wrap gap-2">
              {LETTERS.map((l) =>
                letters.has(l) ? (
                  <Link
                    key={l}
                    href={`/knowledge/glossary?letter=${l}`}
                    className="flex size-9 items-center justify-center rounded-pill border border-control type-label text-primary hover:border-focus"
                  >
                    {l}
                  </Link>
                ) : (
                  <span
                    key={l}
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-pill border border-default type-label text-secondary opacity-40"
                  >
                    {l}
                  </span>
                ),
              )}
            </nav>
            {today ? (
              <div className="flex flex-col gap-2 rounded-card border border-default p-4">
                <p className="type-eyebrow text-secondary">TERM OF THE DAY</p>
                <p className="type-label text-primary">{today.term}</p>
                <p className="type-body-sm text-body">{today.short}</p>
                <ArrowLink asChild className="type-label-sm">
                  <Link href={`/knowledge/glossary/${today.slug}`}>Open glossary</Link>
                </ArrowLink>
              </div>
            ) : null}
          </div>
        </Block>
      ) : null}

      {standards.length ? (
        <Block
          id="standards"
          title="Standards and rules library"
          link={{ label: "All standards and rules", href: "/knowledge/standards" }}
        >
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {standards.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/knowledge/standards/${s.slug}`}
                  className="flex h-full flex-col gap-1 rounded-card border border-default p-4 hover:border-focus"
                >
                  <span className="type-eyebrow text-secondary">
                    {s.issuer.toUpperCase()} · {s.code.toUpperCase()}
                  </span>
                  <span className="type-label text-primary">{s.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {overview?.figures?.length ? (
        <Block id="tracker" title="India Hydrogen Tracker" link={{ label: "Open the tracker", href: "/tracker" }}>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {overview.figures.slice(0, 3).map((f) => (
              <li key={f.id ?? f.label} className="flex flex-col gap-1 rounded-card bg-mint p-5">
                <span className="type-display text-primary">{f.value}</span>
                <span className="type-label text-primary">{f.label}</span>
                <span className="type-caption text-secondary">
                  Source: {f.source}, as of{" "}
                  {new Date(f.asOf).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {media.length ? (
        <Block id="reports" title="Reports and videos">
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {media.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="group flex h-full flex-col gap-2 rounded-card bg-mint p-5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="type-eyebrow text-secondary">{m.eyebrow}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-inverse text-inverse">
                      <Icon name="arrow-right" size={14} />
                    </span>
                  </span>
                  <span className="type-h4 text-primary group-hover:underline">{m.title}</span>
                  <span className="line-clamp-3 type-body-sm text-body">{m.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <div className="pt-12">
        <NewsBand />
      </div>
    </main>
  );
}
