import { describe, expect, it } from "vitest";
import { rowsHidden } from "./SiteHeader";

// Public QC, 16 Nov 2026: the top strip and section nav hide while scrolling down and come back on any scroll up.
describe("the header rows on scroll", () => {
  it("always show near the top of the page", () => {
    expect(rowsHidden(400, 60, true)).toBe(false);
    expect(rowsHidden(0, 85, false)).toBe(false);
  });

  it("hide while scrolling down past them", () => {
    expect(rowsHidden(100, 300, false)).toBe(true);
  });

  it("come back on a scroll up, without a click", () => {
    expect(rowsHidden(900, 880, true)).toBe(false);
  });

  it("ignore tiny jitter either way", () => {
    expect(rowsHidden(500, 502, true)).toBe(true);
    expect(rowsHidden(500, 498, false)).toBe(false);
  });
});
