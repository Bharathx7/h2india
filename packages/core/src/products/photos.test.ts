import { describe, expect, it } from "vitest";
import { photoOf } from "./photos";

describe("photoOf", () => {
  it("uses the largest copy as the source and lists every copy by width", () => {
    expect(
      photoOf({
        original: "https://files/p/original.jpg",
        sizes: {
          "1280": "https://files/p/w1280.webp",
          "320": "https://files/p/w320.webp",
          "640": "https://files/p/w640.webp",
        },
      }),
    ).toEqual({
      src: "https://files/p/w1280.webp",
      srcSet: "https://files/p/w320.webp 320w, https://files/p/w640.webp 640w, https://files/p/w1280.webp 1280w",
    });
  });

  it("falls back to the original when there are no smaller copies", () => {
    expect(photoOf({ original: "https://files/p/original.png", sizes: {} })).toEqual({
      src: "https://files/p/original.png",
      srcSet: "",
    });
  });

  it("gives nothing for a file with no stored object", () => {
    expect(photoOf({ original: null, sizes: {} })).toBeNull();
  });
});
