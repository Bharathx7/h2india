import { CONTENT_SECTION_IDS } from "@h2india/core/authz";
import { describe, expect, it } from "vitest";
import { CONTENT_SLUGS } from "./registry";
import { CONTENT_SECTIONS, SECTION_SLUGS, describeType, sectionById, sectionOf, unsectioned } from "./sections";

// Founder (20 Nov 2026): the content side menu lists every kind of content once, in plain words.
describe("content sections", () => {
  it("put every content type in exactly one section", () => {
    expect(unsectioned()).toEqual([]);
    expect(new Set(SECTION_SLUGS).size).toBe(SECTION_SLUGS.length);
    for (const slug of SECTION_SLUGS) expect(CONTENT_SLUGS).toContain(slug);
  });

  it("describe every type in a sentence", () => {
    for (const slug of SECTION_SLUGS) expect(describeType(slug)?.length ?? 0).toBeGreaterThan(10);
  });

  it("match the section ids an editor can be limited to (core)", () => {
    expect(CONTENT_SECTIONS.map((s) => s.id).sort()).toEqual([...CONTENT_SECTION_IDS].sort());
  });

  it("have unique ids and links", () => {
    expect(new Set(CONTENT_SECTIONS.map((s) => s.id)).size).toBe(CONTENT_SECTIONS.length);
    expect(new Set(CONTENT_SECTIONS.map((s) => s.href)).size).toBe(CONTENT_SECTIONS.length);
  });

  it("find a type's section", () => {
    expect(sectionOf("tenders")?.label).toBe("Opportunities");
    expect(sectionOf("tracker-hubs")?.id).toBe("tracker");
    expect(sectionById("knowledge")?.types.map((t) => t.slug)).toContain("glossary");
    expect(sectionById("nope")).toBeUndefined();
  });
});
