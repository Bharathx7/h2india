import { durationLabel } from "@h2india/core/media";
import { buttonClasses, cx, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allVideos, articlesMentioning, getVideo } from "@/knowledge/data";
import { Chapters, People, Transcript, VideoPlayer, VideoTile } from "@/knowledge/media";
import { ShareButton } from "@/news/client";
import { dayMonthYear } from "@/news/format";
import { Crumbs, wrap } from "@/opportunities/parts";

// A video (273:22703; phones 274:23094, step 5.6): the player (media adapter, M9), chapters, transcript, related
// articles, who's in it and Up next. "Products in this video" joins with the marketplace (Stage 6).

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const v = await getVideo((await params).slug);
  if (!v) return { title: "Not found · H2 Economy" };
  return {
    title: `${v.title} · Videos · H2 Economy`,
    description: v.description.slice(0, 200),
    alternates: { canonical: `/knowledge/media/videos/${v.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Params }) {
  const v = await getVideo((await params).slug);
  if (!v) notFound();
  const [videos, related] = await Promise.all([
    allVideos(),
    articlesMentioning(
      v.title
        .split(/\s+/)
        .filter((w) => w.length > 5)
        .slice(0, 3),
      3,
    ),
  ]);
  const next = videos.filter((x) => x.id !== v.id).slice(0, 4);
  const meta = [
    v.series,
    v.publishedOn ? dayMonthYear(v.publishedOn) : null,
    durationLabel(v.durationMinutes),
    v.language,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Videos", href: "/knowledge/media" }, { label: v.kind ? `${v.kind}s` : "Video" }]} />
      </div>
      <div className={cx(wrap, "flex flex-col gap-8 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <VideoPlayer video={v} />
          <div className="flex flex-col gap-2">
            <h1 className="type-h2 text-primary">{v.title}</h1>
            <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
              {v.kind ? <StatusBadge status={v.kind} tone="neutral" /> : null}
              {meta}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/rfq/new" className={buttonClasses({ size: "sm" })}>
                Request a quote →
              </Link>
              <ShareButton title={v.title} />
            </div>
          </div>
          <p className="type-body text-body">{v.description}</p>
          <Chapters chapters={v.chapters ?? []} />
          <Transcript text={v.transcript} />
          {related.length ? (
            <section aria-labelledby="related" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="related" className="type-h4 text-primary">
                Related articles
              </h2>
              <ul className="flex flex-col">
                {related.map((a) => (
                  <li key={a.id} className="border-t border-default py-2.5">
                    <Link href={`/news/${a.slug}`} className="type-label text-link hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <People title="In this video" people={v.people ?? []} />
          {next.length ? (
            <section aria-labelledby="next" className="flex flex-col gap-3">
              <h2 id="next" className="type-h4 text-primary">
                Up next
              </h2>
              <ul className="flex flex-col gap-3">
                {next.map((x) => (
                  <li key={x.id}>
                    <VideoTile v={x} />
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
