import { buttonClasses, cx, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { allPodcasts, allVideos } from "@/knowledge/data";
import { VideoTile } from "@/knowledge/media";
import { Crumbs, wrap } from "@/opportunities/parts";

// Videos and podcasts (273:22177; phones 274:22816, step 5.6): the featured video, then a row per kind, podcast
// episodes, and the two bands (film with us, request a quote). Playback follows the media adapter (M9).

export const metadata: Metadata = {
  title: "Videos and podcasts · H2 India",
  description: "Explainers, interviews and event highlights from Indian hydrogen suppliers, buyers and policy makers.",
  alternates: { canonical: "/knowledge/media" },
};
export const dynamic = "force-dynamic";

const KINDS = [
  { kind: "Explainer", title: "Explainers", sub: "Supplier engineers explain how hydrogen equipment works." },
  { kind: "60-second explainer", title: "60-second explainers", sub: "One topic, one minute." },
  { kind: "Interview", title: "Interviews", sub: "The Hydrogen Leaders podcast and video interviews." },
  { kind: "Event highlight", title: "Event highlights", sub: "Short summaries of talks and launches." },
];
const CHIPS = ["All", "Explainers", "Interviews", "Event highlights"];

function Row({ id, title, sub, children }: { id: string; title: string; sub: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 pt-10">
      <div>
        <h2 id={id} className="type-h3 text-primary">
          {title}
        </h2>
        <p className="type-body-sm text-secondary">{sub}</p>
      </div>
      {children}
    </section>
  );
}

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show ?? "All";
  const [videos, podcasts] = await Promise.all([allVideos(), allPodcasts()]);
  const featured = videos.find((v) => v.featured) ?? videos[0];
  const side = videos.filter((v) => v !== featured).slice(0, 2);
  const kinds = KINDS.filter(
    (k) => show === "All" || k.title === show || (show === "Interviews" && k.kind === "Interview"),
  );
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-3 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Knowledge", href: "/knowledge" }, { label: "Videos and podcasts" }]} />
        <h1 className="max-w-200 type-h1 text-primary">See how hydrogen equipment works, before you ask for a quote</h1>
        <p className="max-w-180 type-body text-body">
          Explainers, interviews and event highlights from Indian suppliers, buyers and policy makers.
        </p>
        <nav aria-label="Show" className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <Link
              key={c}
              href={c === "All" ? "/knowledge/media" : `/knowledge/media?show=${encodeURIComponent(c)}`}
              aria-current={c === show ? "page" : undefined}
              className={cx(
                "inline-flex h-8 items-center rounded-pill border-[1.5px] px-2.75 type-label",
                c === show
                  ? "border-transparent bg-inverse text-inverse"
                  : "border-control bg-page text-primary hover:border-focus",
              )}
            >
              {c}
            </Link>
          ))}
        </nav>
      </div>
      <div className={cx(wrap, "pb-12")}>
        {!videos.length && !podcasts.length ? (
          <div className="mt-8 rounded-card border border-default py-8">
            <EmptyState kind="first-use" title="Videos are on their way">
              Our first explainers and interviews are being edited.
            </EmptyState>
          </div>
        ) : null}
        {featured && show === "All" ? (
          <div className="grid gap-4 pt-8 lg:grid-cols-[2fr_1fr]">
            <VideoTile v={featured} />
            <div className="flex flex-col gap-4">
              {side.map((v) => (
                <VideoTile key={v.id} v={v} />
              ))}
            </div>
          </div>
        ) : null}
        {kinds.map((k) => {
          const list = videos.filter((v) => (v.kind ?? "Explainer") === k.kind);
          if (!list.length) return null;
          const tall = k.kind === "60-second explainer";
          return (
            <Row key={k.kind} id={k.kind.replace(/\W+/g, "-").toLowerCase()} title={k.title} sub={k.sub}>
              <ul
                className={cx(
                  "grid gap-4",
                  tall ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-4",
                )}
              >
                {list.map((v) => (
                  <li key={v.id}>
                    <VideoTile v={v} tall={tall} />
                  </li>
                ))}
              </ul>
            </Row>
          );
        })}
        {podcasts.length && (show === "All" || show === "Interviews") ? (
          <Row
            id="podcasts"
            title="Podcast episodes"
            sub="Hydrogen Leaders: conversations with the people building India's hydrogen industry."
          >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {podcasts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/knowledge/media/podcasts/${p.slug}`}
                    className="flex h-full flex-col gap-1 rounded-card border border-default p-4 hover:border-focus"
                  >
                    <span className="type-eyebrow text-secondary">
                      {p.show.toUpperCase()}
                      {p.episode ? ` · EPISODE ${String(p.episode)}` : ""}
                    </span>
                    <span className="type-label text-primary">{p.title}</span>
                    <span className="line-clamp-2 type-body-sm text-body">{p.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Row>
        ) : null}
        <section
          aria-labelledby="film"
          className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-card bg-mint p-6"
        >
          <div className="flex flex-col gap-1">
            <p className="type-eyebrow text-secondary">FOR SUPPLIERS</p>
            <h2 id="film" className="type-h4 text-primary">
              Film a short talk with H2 India
            </h2>
            <p className="max-w-150 type-body-sm text-body">
              We film your product, plant or process with an editor and add it to your profile and product pages.
            </p>
          </div>
          <Link href="/advertise" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            How filming works
          </Link>
        </section>
        <section
          aria-labelledby="buy"
          className="mt-6 flex flex-wrap items-center justify-between gap-6 rounded-card bg-inverse p-8 text-inverse"
        >
          <div className="flex max-w-150 flex-col gap-2">
            <p className="type-eyebrow opacity-80">START SOURCING</p>
            <h2 id="buy" className="type-h2">
              Buy hydrogen equipment from verified Indian suppliers
            </h2>
            <p className="type-body-sm opacity-80">
              Send one request to up to 5 suppliers and compare their quotes side by side.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/rfq/new" className={buttonClasses({ variant: "primary" })}>
              Request a quote
            </Link>
            <Link href="/list-your-company" className={buttonClasses({ variant: "inverse" })}>
              Sell on H2 India
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
