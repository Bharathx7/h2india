import { describe, expect, it } from "vitest";
import { confirmsName, purgeBlocker, purgeRule, uploadsIn } from "./purge-rules";

const facts = { archived: false, published: false, everPublished: false, usedBy: 0 };

describe("Delete permanently: what must be true first (A198)", () => {
  it("archivable records are deleted from the Archived list only", () => {
    expect(purgeRule("tenders")).toBe("archived");
    expect(purgeBlocker("archived", facts)).toMatch(/Archive it first/);
    expect(purgeBlocker("archived", { ...facts, archived: true })).toBeNull();
  });

  it("an article must be off the site", () => {
    expect(purgeRule("articles")).toBe("unpublished");
    expect(purgeBlocker("unpublished", { ...facts, published: true })).toBe("Unpublish it first.");
    expect(purgeBlocker("unpublished", { ...facts, everPublished: true })).toBeNull();
  });

  it("a legal page or newsletter issue that was ever published stays on record", () => {
    expect(purgeRule("legal-pages")).toBe("never-published");
    expect(purgeRule("newsletter-issues")).toBe("never-published");
    expect(purgeBlocker("never-published", { ...facts, everPublished: true })).toMatch(/stays on record/);
    expect(purgeBlocker("never-published", facts)).toBeNull();
  });

  it("authors, topics, tags and pictures go only when nothing uses them", () => {
    for (const slug of ["authors", "topics", "tags", "media"]) expect(purgeRule(slug)).toBe("unused");
    expect(purgeBlocker("unused", { ...facts, usedBy: 3 })).toBe(
      "It's still used by 3 records. Remove it from them first.",
    );
    expect(purgeBlocker("unused", { ...facts, usedBy: 1 })).toMatch(/1 record\./);
    expect(purgeBlocker("unused", facts)).toBeNull();
  });

  it("what readers sent and what the system saw is never deleted", () => {
    for (const slug of ["corrections", "source-changes", "submissions", "report-leads", "tracker-changes", "editors"])
      expect(purgeRule(slug)).toBeNull();
    expect(purgeRule("unknown-type")).toBeNull();
    expect(purgeBlocker(null, { ...facts, archived: true })).toMatch(/can't be deleted/);
  });

  it("the confirmation is the record's name", () => {
    expect(confirmsName("  green ammonia   bids ", "Green ammonia bids")).toBe(true);
    expect(confirmsName("Green ammonia", "Green ammonia bids")).toBe(false);
    expect(confirmsName("", "")).toBe(false);
  });

  it("finds pictures placed inside rich text", () => {
    const body = {
      root: {
        children: [
          { type: "paragraph", children: [{ type: "text", text: "x" }] },
          { type: "upload", relationTo: "media", value: 7 },
          { type: "upload", relationTo: "media", value: { id: 9, url: "/a.webp" } },
          { type: "upload", relationTo: "media-files", value: 7 },
        ],
      },
    };
    expect(uploadsIn(body, "media")).toEqual([7, 9]);
    expect(uploadsIn(null, "media")).toEqual([]);
  });
});
