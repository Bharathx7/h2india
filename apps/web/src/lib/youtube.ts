// YouTube videos inside articles and knowledge pages (founder, 19 Nov 2026, A195). Only YouTube is embedded, and only
// through its privacy-enhanced host (youtube-nocookie.com), so nothing is stored in the reader's browser until they
// press play. Pure: unit-tested.

const ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character video ID from any usual YouTube link, or null when it isn't a YouTube video link. */
export function youtubeId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = url.searchParams.get("v");
    else if (first === "embed" || first === "shorts" || first === "live" || first === "v") id = second ?? null;
  }
  return id && ID.test(id) ? id : null;
}

/** Where the player loads from. The CSP allows only this host in frames (security/headers.ts). */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function youtubeEmbedUrl(id: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?rel=0`;
}

/** The video's still image, shown before the reader presses play. */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
