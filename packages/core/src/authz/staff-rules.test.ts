import { describe, expect, it } from "vitest";
import { cleanSections, completePermissions, CONTENT_SECTION_IDS } from "./staff-rules";

describe("team and roles rules", () => {
  it("make a role's ticks whole: more than View brings View, Publish brings Edit", () => {
    expect(completePermissions(["content.publish"])).toEqual(["content.edit", "content.publish", "content.view"]);
    expect(completePermissions(["orders.export", "reports.view"])).toEqual([
      "orders.export",
      "orders.view",
      "reports.view",
    ]);
  });

  it("accept all sections (null) or a known, non-empty list", () => {
    expect(cleanSections(null)).toBeNull();
    expect(cleanSections(["tracker", "articles", "tracker"])).toEqual(["articles", "tracker"]);
    expect(() => cleanSections([])).toThrow("Pick at least one section");
    expect(() => cleanSections(["finance"])).toThrow('There is no content section "finance"');
    expect(CONTENT_SECTION_IDS).toContain("articles");
  });
});
