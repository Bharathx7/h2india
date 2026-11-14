import { describe, expect, it } from "vitest";
import { durationLabel, hostName, playbackFor } from "./index";

describe("media adapter (M9 open)", () => {
  it("plays files in the browser and opens everything else on its host", () => {
    expect(playbackFor("https://cdn.example.org/ep14.mp3")).toEqual({
      kind: "audio-file",
      src: "https://cdn.example.org/ep14.mp3",
      host: "cdn.example.org",
    });
    expect(playbackFor("https://cdn.example.org/v.mp4?x=1")?.kind).toBe("video-file");
    expect(playbackFor("https://www.youtube.com/watch?v=abc")).toEqual({
      kind: "external",
      href: "https://www.youtube.com/watch?v=abc",
      host: "YouTube",
    });
    expect(playbackFor("http://insecure.example.org/a.mp3")).toBeNull();
    expect(playbackFor("")).toBeNull();
  });

  it("names hosts and durations", () => {
    expect(hostName("https://open.spotify.com/episode/1")).toBe("Spotify");
    expect(durationLabel(32)).toBe("32 min");
    expect(durationLabel(75)).toBe("1 h 15 min");
    expect(durationLabel(0)).toBeNull();
  });
});
