// The media adapter (step 5.6, M9): how a video or podcast address is played. Until the host is chosen (M9), nothing
// from a third party is embedded (no player scripts or tracking frames; 5.9 consent rules): a direct audio or video
// file plays in the browser's own player, and anything else opens on its host in a new tab. When M9 is answered, the
// chosen host's embed goes here and nowhere else.

export type MediaPlayback =
  { kind: "video-file" | "audio-file"; src: string; host: string } | { kind: "external"; href: string; host: string };

const VIDEO = /\.(mp4|webm|m4v|mov)(\?|#|$)/i;
const AUDIO = /\.(mp3|m4a|aac|ogg|oga|wav)(\?|#|$)/i;

const HOSTS: Record<string, string> = {
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "vimeo.com": "Vimeo",
  "spotify.com": "Spotify",
  "podcasts.apple.com": "Apple Podcasts",
  "soundcloud.com": "SoundCloud",
};

/** "YouTube", "Spotify", or the bare host name. */
export function hostName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/^open\./, "");
    const known = Object.entries(HOSTS).find(([h]) => host === h || host.endsWith(`.${h}`));
    return known ? known[1] : host;
  } catch {
    return "the host";
  }
}

/** How to play this address; null when it isn't a web address at all. */
export function playbackFor(url: string | null | undefined): MediaPlayback | null {
  const u = url?.trim();
  if (!u || !/^https:\/\/\S+$/.test(u)) return null;
  const host = hostName(u);
  if (VIDEO.test(u)) return { kind: "video-file", src: u, host };
  if (AUDIO.test(u)) return { kind: "audio-file", src: u, host };
  return { kind: "external", href: u, host };
}

/** "12:30" from minutes, for duration badges. */
export function durationLabel(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  return minutes >= 60 ? `${String(Math.floor(minutes / 60))} h ${String(minutes % 60)} min` : `${String(minutes)} min`;
}
