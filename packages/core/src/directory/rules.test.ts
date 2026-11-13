import { describe, expect, it } from "vitest";
import { byState, directorySearch, filterDirectory, parseDirectory, type DirectoryEntry } from "./rules";

const entry = (name: string, over: Partial<DirectoryEntry> = {}): DirectoryEntry => ({
  id: name,
  name,
  href: `/directory/companies/${name}`,
  initials: name.slice(0, 2),
  types: ["Manufacturer"],
  categories: [],
  summary: "",
  city: "",
  state: "Maharashtra",
  verified: false,
  claimStatus: "Claimed",
  ...over,
});

const ENTRIES = [
  entry("Hydrotek", { verified: true, categories: ["PEM electrolysis"] }),
  entry("Varun Gas", { types: ["Supplier & trader"], state: "Tamil Nadu", categories: ["Compression"] }),
  entry("Sahyadri", { types: ["Start-up"], categories: ["PEM electrolysis"] }),
  entry("Indus Institute", { types: ["Research"], state: "Gujarat" }),
];

describe("the directory", () => {
  it("filters by type, state, technology and badge, with counts that ignore their own group", () => {
    const r = filterDirectory(ENTRIES, parseDirectory({ state: "Maharashtra", tech: "PEM electrolysis" }));
    expect(r.items.map((e) => e.name)).toEqual(["Hydrotek", "Sahyadri"]);
    expect(r.facets.states).toEqual([
      { value: "Maharashtra", count: 2 },
      { value: "Gujarat", count: 0 },
      { value: "Tamil Nadu", count: 0 },
    ]);
    expect(r.facets.types.find((t) => t.key === "startup")?.count).toBe(1);
    expect(filterDirectory(ENTRIES, parseDirectory({ type: "supplier" })).items.map((e) => e.name)).toEqual([
      "Varun Gas",
    ]);
    expect(filterDirectory(ENTRIES, parseDirectory({ verified: "1" })).total).toBe(1);
    expect(filterDirectory(ENTRIES, parseDirectory({ q: "indus" })).items.map((e) => e.name)).toEqual([
      "Indus Institute",
    ]);
  });

  it("lists verified organisations first, and the map gets every match", () => {
    const r = filterDirectory(ENTRIES, parseDirectory({}));
    expect(r.items[0]?.name).toBe("Hydrotek");
    expect(r.all).toHaveLength(4);
    expect(byState(r.all).map((g) => g.state)).toEqual(["Maharashtra", "Gujarat", "Tamil Nadu"]);
  });

  it("round-trips the address", () => {
    const q = parseDirectory({
      type: "epc",
      state: ["Gujarat", "Kerala"],
      verified: "1",
      view: "map",
      page: "2",
      bad: "x",
    });
    expect(
      parseDirectory(Object.fromEntries(new URLSearchParams(directorySearch(q).slice(1)).entries())),
    ).toMatchObject({
      type: "epc",
      verified: true,
      view: "map",
      page: 2,
    });
    expect(directorySearch(parseDirectory({}))).toBe("");
  });
});
