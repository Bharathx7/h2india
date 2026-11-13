import { describe, expect, it } from "vitest";
import type { AttributeDef } from "../catalogue/attributes";
import {
  activeFilters,
  canShowPrice,
  cardChips,
  defaultViewFor,
  formatValue,
  leadTimeLabel,
  listingSearch,
  parseListing,
  type PriceSurface,
} from "./rules";

const def = (over: Partial<AttributeDef> & Pick<AttributeDef, "key" | "label" | "type">): AttributeDef => ({
  unit: null,
  min: null,
  max: null,
  options: [],
  hint: null,
  required: false,
  filterable: true,
  comparable: true,
  testCondition: null,
  displayGroup: "Performance",
  position: 0,
  ...over,
});

const DEFS = [
  def({ key: "rated_power", label: "Rated power", type: "number", unit: "kW" }),
  def({ key: "output_pressure", label: "Output pressure", type: "number", unit: "bar" }),
  def({ key: "purity", label: "Purity", type: "choice", options: ["99.99%", "99.999%"], comparable: false }),
  def({ key: "notes", label: "Notes", type: "text", filterable: false, comparable: false }),
];

// Playbook step 6.4: the price rule as one function, with these tests in CI.
describe("price display rule", () => {
  it("shows price only on the product page of a fixed-price item", () => {
    expect(canShowPrice({ surface: "pdp", pricing: "fixed", price: 1250000 })).toBe(true);
    expect(canShowPrice({ surface: "pdp", pricing: "quote" })).toBe(false);
    expect(canShowPrice({ surface: "pdp", pricing: "fixed", price: null })).toBe(false);
  });
  it("shows an indicative range only on the product page (A141)", () => {
    expect(canShowPrice({ surface: "pdp", pricing: "indicative", price: 400000000 })).toBe(true);
    for (const surface of ["card", "search", "filter", "compare", "listing-table"] as const) {
      expect(canShowPrice({ surface, pricing: "indicative", price: 400000000 })).toBe(false);
    }
  });
  it.each<PriceSurface>(["card", "search", "filter", "compare", "listing-table"])("never on %s", (surface) => {
    expect(canShowPrice({ surface, pricing: "fixed", price: 1250000 })).toBe(false);
  });
});

describe("listing address", () => {
  it("reads only the category's filterable attributes and round-trips", () => {
    const q = parseListing(
      {
        sub: ["pem", "Bad Slug!"],
        "a.purity": ["99.999%", "made-up"],
        "min.rated_power": "100",
        "max.rated_power": "1,000",
        "a.notes": "x",
        "min.unknown": "5",
        verified: "1",
        india: "1",
        lead: "12",
        sort: "lead-time",
        view: "table",
        page: "2",
        per: "48",
      },
      DEFS,
    );
    expect(q).toMatchObject({
      sub: ["pem"],
      choices: { purity: ["99.999%"] },
      ranges: { rated_power: { min: 100, max: 1000 } },
      verified: true,
      madeInIndia: true,
      leadWeeks: 12,
      sort: "lead-time",
      view: "table",
      page: 2,
      perPage: 48,
    });
    const again = parseListing(Object.fromEntries(new URLSearchParams(listingSearch(q).slice(1)).entries()), DEFS);
    expect(again.ranges).toEqual(q.ranges);
    expect(listingSearch(parseListing({}, DEFS))).toBe("");
    expect(listingSearch(q, { page: 1 })).not.toContain("page=");
  });

  it("falls back to safe defaults", () => {
    const q = parseListing({ sort: "price", per: "1000", page: "-3", lead: "99" }, DEFS);
    expect(q).toMatchObject({ sort: "relevance", perPage: 24, page: 1, leadWeeks: null });
  });
});

describe("default view and filter removal", () => {
  it("opens Systems and Components as a table, keeps the address short, and names each filter to remove", () => {
    const q = parseListing({ verified: "1", "min.rated_power": "500" }, DEFS, { defaultView: "table" });
    expect(q.view).toBe("table");
    expect(listingSearch(q)).not.toContain("view=");
    expect(listingSearch(q, { view: "grid" })).toContain("view=grid");
    expect(defaultViewFor("systems")).toBe("table");
    expect(defaultViewFor("services")).toBe("grid");
    expect(activeFilters(q, DEFS).map((f) => f.label)).toEqual(["Rated power at least 500 kW", "Verified only"]);
    expect(activeFilters(q, DEFS)[1]?.without).toEqual({ verified: false });
  });
});

describe("values on cards and tables", () => {
  it("writes values as the frames do", () => {
    expect(formatValue(DEFS[0] as AttributeDef, 1000)).toBe("1 MW");
    expect(formatValue(DEFS[0] as AttributeDef, 500)).toBe("500 kW");
    expect(formatValue(def({ key: "p", label: "P", type: "range", unit: "bar g" }), { min: 20, max: 30 })).toBe(
      "20–30 bar g",
    );
    expect(leadTimeLabel(14, 16)).toBe("14–16 weeks");
    expect(leadTimeLabel(8, 8)).toBe("8 weeks");
    expect(leadTimeLabel(null, null)).toBeNull();
    expect(cardChips(DEFS, { rated_power: 1000, output_pressure: 30, purity: "99.99%" }, ["ISO 22734", "CE"])).toEqual([
      "1 MW",
      "30 bar",
      "ISO 22734",
    ]);
  });
});
