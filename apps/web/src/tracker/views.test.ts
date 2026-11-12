import { describe, expect, it } from "vitest";
import { changeKind, changesCsv, filterChanges } from "./changes";
import { applyFilters, dataAsOf, subView, toCsv, type Row } from "./views";

// Step 5.6: the tracker sub-views' filters, tiles and CSV agree, and every CSV row carries its source and date.

const src = (asOf: string) => ({ name: "SECI result", url: "https://example.org/r", tier: "official", asOf });
const projects: Row[] = [
  {
    id: 1,
    slug: "a",
    name: "Mundra",
    company: "Kutch Ammonia Works",
    state: "gujarat",
    capacityTpa: 25_000,
    stage: "Under construction",
    underSight: true,
    technology: "Alkaline",
    source: src("2026-11-10T00:00:00.000Z"),
  },
  {
    id: 2,
    slug: "b",
    name: "Paradip",
    company: "Deccan Ammonia Works",
    state: "odisha",
    capacityTpa: 18_000,
    stage: "Contracted",
    underSight: true,
    source: src("2026-11-01T00:00:00.000Z"),
  },
  {
    id: 3,
    slug: "c",
    name: "Talegaon",
    company: "Greenfield Hydrogen",
    state: "maharashtra",
    capacityTpa: 20,
    stage: "Commissioned",
    underSight: false,
    source: src("2026-10-01T00:00:00.000Z"),
  },
];

describe("tracker sub-views (738:5437…)", () => {
  const view = subView("projects");
  if (!view) throw new Error("projects view missing");

  it("filters by state, status and size, ignoring unknown values", () => {
    expect(applyFilters(view, projects, { state: "gujarat" }).map((r) => r.id)).toEqual([1]);
    expect(applyFilters(view, projects, { status: "Commissioned" }).map((r) => r.id)).toEqual([3]);
    expect(applyFilters(view, projects, { size: "large" }).map((r) => r.id)).toEqual([1, 2]);
    expect(applyFilters(view, projects, { state: "nowhere" }).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("sums the tiles and the chart from the rows shown", () => {
    expect(view.tiles(projects, new Date())).toEqual([
      { value: "3", label: "projects tracked" },
      { value: "43,000", label: "t/yr awarded under SIGHT" },
      { value: "20", label: "t/yr commissioned" },
    ]);
    const bars = view.chart?.(projects).bars ?? [];
    expect(bars.find((b) => b.label === "Contracted")?.value).toBe(18_000);
    expect(dataAsOf(projects)).toBe("2026-11-10T00:00:00.000Z");
  });

  it("writes a CSV with the drawn columns plus source and as-of date", () => {
    const csv = toCsv(view, projects.slice(0, 1));
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe("Company,Project,State,Capacity (t/yr),Technology,Status,Source,Source name,Source link,As of");
    expect(row).toBe(
      'Kutch Ammonia Works,Mundra,Gujarat,"25,000",Alkaline,Under construction,https://example.org/r,SECI result,https://example.org/r,2026-11-10',
    );
  });

  it("knows each view", () => {
    expect(subView("state-policies")?.slug).toBe("tracker-policies");
    expect(subView("hubs")).toBeNull();
  });
});

describe("recent changes (740:841)", () => {
  const base = {
    id: 1,
    at: "2026-11-10T00:00:00.000Z",
    recordTitle: "Mundra",
    view: "Projects",
    before: "Contracted",
    after: "Under construction",
    source: "Company",
    sourceUrl: null,
    updatedAt: "",
    createdAt: "",
    record: { relationTo: "tracker-projects" as const, value: 1 },
  };
  it("sorts changes into added, status and figures", () => {
    expect(changeKind({ field: "Record" })).toBe("added");
    expect(changeKind({ field: "Status" })).toBe("status");
    expect(changeKind({ field: "Capacity (t/yr)" })).toBe("figures");
    const list = [
      { ...base, field: "Status" },
      { ...base, id: 2, field: "Record" },
    ];
    expect(filterChanges(list, "added").map((c) => c.id)).toEqual([2]);
    expect(changesCsv(list.slice(0, 1))).toContain(
      "2026-11-10,Mundra,Projects,Status,Contracted,Under construction,Company,",
    );
  });
});
