import type { Access } from "payload";
import { describe, expect, it } from "vitest";
import { sectionAllows, sectionForSlug, withSections } from "./section-access";

// Section limits (founder, 20 Nov 2026): an editor limited to some sections can't create, change or delete anything
// outside them, whatever screen they use; everyone else keeps the collection's own rules.
const editor = (sections: string[] | null, permissions = ["content.view", "content.edit", "content.delete"]) => ({
  req: { user: { id: 1, collection: "editors", permissions, sections } },
});
const run = (access: Access | undefined, args: unknown) => (access as (a: unknown) => unknown)(args);

describe("section limits", () => {
  it("know each type's section", () => {
    expect(sectionForSlug("articles")).toBe("articles");
    expect(sectionForSlug("tracker-stations")).toBe("tracker");
    expect(sectionForSlug("pricing")).toBe("site");
    expect(sectionForSlug("editors")).toBeNull();
  });

  it("allow everything with no limit, and only the chosen sections with one", () => {
    expect(sectionAllows(null, "tenders")).toBe(true);
    expect(sectionAllows(["tracker"], "tracker-hubs")).toBe(true);
    expect(sectionAllows(["tracker"], "tenders")).toBe(false);
    expect(sectionAllows(["tracker"], "editors")).toBe(true);
  });

  it("refuse writes outside the editor's sections, before the collection's own rule", () => {
    const own: Access = () => true;
    const [tenders] = withSections([
      { slug: "tenders", fields: [], access: { create: own, update: own, delete: own, read: own } },
    ]);
    const access = tenders?.access;
    expect(run(access?.update, editor(["tracker"]))).toBe(false);
    expect(run(access?.create, editor(["tracker"]))).toBe(false);
    expect(run(access?.delete, editor(["tracker"]))).toBe(false);
    expect(run(access?.update, editor(["opportunities"]))).toBe(true);
    expect(run(access?.update, editor(null))).toBe(true);
    // Reading is never limited.
    expect(access?.read).toBe(own);
  });
});
