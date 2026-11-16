import { durationLabel } from "@h2india/core/media";
import { cx } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allGuides, allReports, getPodcast } from "@/knowledge/data";
import { Chapters, People, PodcastPlayer, Transcript } from "@/knowledge/media";
import { ShareButton } from "@/news/client";
import { dayMonthYear } from "@/news/format";
import { Crumbs, wrap } from "@/opportunities/parts";

// A podcast episode (736:1169; phones 745:7642, step 5.6): the player (media adapter, M9), show notes, chapters,
// transcript, who's in it and what to read next.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getPodcast((await params).slug);
  if (!p) return { title: "Not found · H2 Economy" };
  return {
    title: `${p.title} · ${p.show} · H2 Economy`,
    description: p.description.slice(0, 200),
    alternates: { canonical: `/knowledge/media/podcasts/${p.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function PodcastPage({ params }: { params: Params }) {
  const p = await getPodcast((await params).slug);
  if (!p) notFound();
  const [guides, reports] = await Promise.all([allGuides(), allReports()]);
  const readNext = [
    ...guides.slice(0, 1).map((g) => ({
      href: `/knowledge/insights/${g.slug}`,
      title: g.title,
      meta: `Guide · ${dayMonthYear(g.updatedAt)}`,
    })),
    ...reports.slice(0, 1).map((r) => ({
      href: `/knowledge/reports/${r.slug}`,
      title: r.title,
      meta: `Report · ${dayMonthYear(r.publishedOn)}`,
    })),
  ];
  const meta = [
    `${p.show}${p.episode ? ` · episode ${String(p.episode)}` : ""}`,
    p.publishedOn ? dayMonthYear(p.publishedOn) : null,
    durationLabel(p.durationMinutes),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "Videos & podcasts", href: "/knowledge/media" },
            { label: `${p.show} podcast` },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">{p.title}</h1>
            <p className="type-body text-body">{meta}</p>
          </div>
          <ShareButton title={p.title} />
        </div>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-4">
          <PodcastPlayer episode={p} />
          <section aria-labelledby="notes" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="notes" className="type-h4 text-primary">
              Show notes
            </h2>
            <p className="type-body text-body">{p.description}</p>
          </section>
          <Chapters chapters={p.chapters ?? []} />
          <Transcript text={p.transcript} />
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <People title="In this episode" people={p.people ?? []} />
          {readNext.length ? (
            <section aria-labelledby="read-next" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="read-next" className="type-h4 text-primary">
                Read next
              </h2>
              <ul className="flex flex-col">
                {readNext.map((r) => (
                  <li key={r.href} className="border-t border-default py-2.5">
                    <Link href={r.href} className="type-label text-link hover:underline">
                      {r.title}
                    </Link>
                    <p className="type-caption text-secondary">{r.meta}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
