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
});
