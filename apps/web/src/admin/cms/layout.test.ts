import { describe, expect, it } from "vitest";
import { describeFields } from "./fields";
import { recordCards } from "./layout";

describe("recordCards (640:8, 640:773, 643:1330)", () => {
  const fields = describeFields([
    { name: "title", type: "text" },
    { name: "issuer", type: "text" },
    { name: "keyDates", label: "Key dates", type: "array", fields: [{ name: "label", type: "text" }] },
    { name: "sourceUrl", type: "text" },
    { name: "documents", type: "array", fields: [{ name: "title", type: "text" }] },
    { name: "slug", type: "text", admin: { position: "sidebar" } },
  ]);
  it("puts the record first, each list in its own card, and the official page and documents last", () => {
    const cards = recordCards("tenders", "Tender", fields);
    expect(cards.map((c) => [c.title, c.fields.map((f) => f.name)])).toEqual([
      ["About the tender", ["title", "issuer"]],
      ["Key dates", ["keyDates"]],
      ["Official documents", ["sourceUrl", "documents"]],
    ]);
    expect(cards[1]?.fields[0]?.bare).toBe(true);
  });
  it("uses the frame's names where a frame gives one", () => {
    expect(recordCards("tracker-projects", "Project", fields)[0]?.title).toBe("Project");
    expect(recordCards("schemes", "Scheme", fields).at(-1)?.title).toBe("Sources and documents");
  });
  it("draws the Grant, Event, Job and Standard cards as on 643:8, 643:778, 645:8 and 645:1249, keeping every field", async () => {
    const { Events, Grants, Jobs } = await import("../../cms/records/collections");
    const { Standards } = await import("../../cms/knowledge/collections");
    const titles = (slug: string, raw: unknown[]) =>
      recordCards(slug, "Record", describeFields(raw)).map((c) => c.title);
    expect(titles("grants", Grants.fields).slice(0, 2)).toEqual(["At a glance", "How to apply and documents"]);
    expect(titles("events", Events.fields).slice(0, 2)).toEqual(["Event details", "Placement"]);
    expect(titles("jobs", Jobs.fields).slice(0, 2)).toEqual(["Role", "Apply and dates"]);
    expect(titles("standards", Standards.fields)[0]).toBe("Record");
    for (const [slug, c] of [
      ["grants", Grants],
      ["events", Events],
      ["jobs", Jobs],
      ["standards", Standards],
    ] as const) {
      const all = describeFields(c.fields)
        .filter((f) => !f.sidebar)
        .map((f) => f.name)
        .sort();
      const shown = recordCards(slug, "Record", describeFields(c.fields))
        .flatMap((card) => card.fields.map((f) => f.name))
        .sort();
      expect(shown).toEqual(all);
    }
  });
});
