import { describe, expect, it } from "vitest";
import { rowsHidden, tabbedIn } from "./SiteHeader";

// Public QC, 16 Nov 2026: the top strip hides while scrolling down and comes back on any scroll up. Since the design
// upgrade (19 Nov 2026) the section nav shares the main row and always stays.
describe("the header rows on scroll", () => {
  it("always show near the top of the page", () => {
    expect(rowsHidden(400, 60, true)).toBe(false);
    expect(rowsHidden(0, 36, false)).toBe(false);
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

// Public QC 5, 20 Nov 2026: opening a section menu or closing search with the mouse hands focus to a header button;
// that must not bring the strip back. Only a Tab press does.
describe("focus that brings the strip back", () => {
  it("is a Tab press", () => {
    expect(tabbedIn({ kind: "key", key: "Tab" })).toBe(true);
  });

  it("is not a click, typing, Escape or nothing at all", () => {
    expect(tabbedIn({ kind: "pointer" })).toBe(false);
    expect(tabbedIn({ kind: "key", key: "a" })).toBe(false);
    expect(tabbedIn({ kind: "key", key: "Escape" })).toBe(false);
    expect(tabbedIn(null)).toBe(false);
  });
});
