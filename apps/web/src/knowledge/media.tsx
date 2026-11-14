import { durationLabel, playbackFor } from "@h2india/core/media";
import { cx, Icon } from "@h2india/ui";
import Link from "next/link";
import type { Podcast, Video } from "@/payload-types";

// Video and podcast pieces (273:22177, 273:22703, 736:1169; step 5.6). Playback goes through the media adapter (M9):
// files play in the browser's player; anything else opens on its host, so no third-party player loads here.

export function thumbOf(v: Video): string | null {
  return typeof v.thumbnail === "object" && v.thumbnail ? (v.thumbnail.url ?? null) : null;
}

export function VideoPlayer({ video }: { video: Video }) {
  const play = playbackFor(video.url);
  const thumb = thumbOf(video);
  if (play?.kind === "video-file") {
    return (
      <video
        controls
        preload="metadata"
        poster={thumb ?? undefined}
        className="aspect-video w-full rounded-card bg-inverse"
      >
        <source src={play.src} />
        <track kind="captions" />
      </video>
    );
  }
  return (
    <a
      href={play?.kind === "external" ? play.href : video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card bg-inverse"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- CMS media */}
      {thumb ? <img src={thumb} alt="" className="absolute inset-0 size-full object-cover opacity-60" /> : null}
      <span className="relative flex size-16 items-center justify-center rounded-pill bg-accent text-primary group-hover:scale-105">
        <Icon name="play" size={28} />
      </span>
      <span className="absolute bottom-3 left-4 type-label-sm text-inverse">
        Watch on {play?.host ?? "the host"} ↗<span className="sr-only"> (opens in a new tab)</span>
      </span>
    </a>
  );
}

export function PodcastPlayer({ episode }: { episode: Podcast }) {
  const play = playbackFor(episode.url);
  return (
    <section aria-label="Listen" className="flex flex-col gap-3 rounded-card bg-inverse p-5 text-inverse">
      <div className="flex items-center gap-4">
        {play?.kind === "external" ? (
          <a
            href={play.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-pill bg-accent px-5 type-label text-primary"
          >
            Play on {play.host} ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
        <span className="flex flex-col">
          <span className="type-label">{episode.title}</span>
          {(episode.people ?? []).length ? (
            <span className="type-caption opacity-80">{(episode.people ?? []).map((p) => p.name).join(", ")}</span>
          ) : null}
        </span>
        {episode.durationMinutes ? (
          <span className="ml-auto type-spec">{durationLabel(episode.durationMinutes)}</span>
        ) : null}
      </div>
      {play?.kind === "audio-file" ? <audio controls preload="metadata" src={play.src} className="w-full" /> : null}
      {episode.alsoOn ? <p className="type-caption opacity-80">Also on {episode.alsoOn}.</p> : null}
    </section>
  );
}

export function Chapters({ chapters }: { chapters: { id?: string | null; at: string; title: string }[] }) {
  if (!chapters.length) return null;
  return (
    <section aria-labelledby="chapters" className="flex flex-col gap-2 rounded-card border border-default p-5">
      <h2 id="chapters" className="type-h4 text-primary">
        Chapters
      </h2>
      <ol className="flex flex-col">
        {chapters.map((c) => (
          <li key={c.id ?? c.at} className="flex gap-4 border-t border-default py-2 type-body-sm text-body">
            <span className="w-12 type-spec text-link">{c.at}</span>
            {c.title}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Transcript: the first two turns, then the rest behind "Show the full transcript" (a native disclosure). */
export function Transcript({ text }: { text: string | null | undefined }) {
  const turns = (text ?? "")
    .split(/\n(?=[^\n:]{2,60}:\s*\n?)/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const m = /^([^\n:]{2,60}):\s*([\s\S]*)$/.exec(t);
      return m ? { who: m[1] ?? "", said: (m[2] ?? "").trim() } : { who: "", said: t };
    });
  if (!turns.length) return null;
  const Turn = ({ t }: { t: { who: string; said: string } }) => (
    <div className="flex flex-col gap-0.5">
      {t.who ? <p className="type-label text-primary">{t.who}</p> : null}
      <p className="type-body-sm text-body">{t.said}</p>
    </div>
  );
  return (
    <section aria-labelledby="transcript" className="flex flex-col gap-3 rounded-card border border-default p-5">
      <div>
        <h2 id="transcript" className="type-h4 text-primary">
          Transcript
        </h2>
        <p className="type-caption text-secondary">Machine transcript, checked by our editors.</p>
      </div>
      {turns.slice(0, 2).map((t, i) => (
        <Turn key={i} t={t} />
      ))}
      {turns.length > 2 ? (
        <details className="group flex flex-col gap-3">
          <summary className="cursor-pointer list-none type-label text-primary group-open:hidden">
            Show the full transcript
          </summary>
          <div className="flex flex-col gap-3">
            {turns.slice(2).map((t, i) => (
              <Turn key={i} t={t} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function People({
  title,
  people,
}: {
  title: string;
  people: { id?: string | null; name: string; role?: string | null }[];
}) {
  if (!people.length) return null;
  return (
    <section aria-labelledby="people" className="flex flex-col gap-3 rounded-card border border-default p-5">
      <h2 id="people" className="type-h4 text-primary">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.id ?? p.name} className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
              {p.name
                .split(/\s+/)
                .map((w) => w.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span className="flex flex-col">
              <span className="type-label text-link">{p.name}</span>
              {p.role ? <span className="type-caption text-secondary">{p.role}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VideoTile({ v, tall = false, className }: { v: Video; tall?: boolean; className?: string }) {
  const thumb = thumbOf(v);
  return (
    <Link href={`/knowledge/media/videos/${v.slug}`} className={cx("group flex flex-col gap-2", className)}>
      <span
        className={cx(
          "relative flex items-center justify-center overflow-hidden rounded-card bg-mint",
          tall ? "aspect-[9/16]" : "aspect-video",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- CMS media */}
        {thumb ? <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <span className="relative flex size-10 items-center justify-center rounded-pill bg-page text-icon-primary shadow-soft">
          <Icon name="play" size={18} />
        </span>
        {v.durationMinutes ? (
          <span className="absolute bottom-2 right-2 rounded-control bg-inverse px-1.5 py-0.5 type-spec text-inverse">
            {durationLabel(v.durationMinutes)}
          </span>
        ) : null}
      </span>
      <span className="type-label text-primary group-hover:underline">{v.title}</span>
      <span className="type-caption text-secondary">{[v.series, v.kind].filter(Boolean).join(" · ")}</span>
    </Link>
  );
}
