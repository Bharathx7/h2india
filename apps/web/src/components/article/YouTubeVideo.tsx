"use client";

import { Icon } from "@h2india/ui";
import { useState } from "react";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";

// A YouTube video in an article (A196). Until the reader presses play only the still image shows, so YouTube isn't
// contacted for the player before then; the player comes from youtube-nocookie.com.

export function YouTubeVideo({ id, title, caption }: { id: string; title: string; caption?: string | null }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="my-2 flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-card bg-subtle">
        {playing ? (
          <iframe
            src={`${youtubeEmbedUrl(id)}&autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
            }}
            className="group focus-ring absolute inset-0 h-full w-full"
          >
            <span className="sr-only">Play video: {title}</span>
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's still, loaded only on this page */}
            <img src={youtubeThumbnail(id)} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill bg-page text-primary shadow-md transition-transform group-hover:scale-105"
            >
              <Icon name="play" size={28} />
            </span>
          </button>
        )}
      </div>
      {caption ? <figcaption className="type-caption text-secondary">{caption}</figcaption> : null}
    </figure>
  );
}
