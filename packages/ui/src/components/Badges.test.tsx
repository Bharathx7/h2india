import { describe, expect, it } from "vitest";
import { STATUS_TONE } from "./Badges";

describe("status badge words", () => {
  it("covers every status word in the Figma description, each with one tone", () => {
    const words = Object.keys(STATUS_TONE);
    expect(words).toHaveLength(25);
    expect(new Set(Object.values(STATUS_TONE))).toEqual(
      new Set(["neutral", "progress", "success", "warning", "error"]),
    );
    expect(STATUS_TONE["Changes requested"]).toBe("warning");
    expect(STATUS_TONE["Under review"]).toBe("progress");
  });
});
