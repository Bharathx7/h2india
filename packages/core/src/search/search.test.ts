import { describe, expect, it } from "vitest";
import { initialsOf } from "./companies";
import { findPriceField, productDocument } from "./documents";
import { PRICE_FIELD, SEARCH_INDEXES, SEARCH_INDEX_UIDS, SEARCH_SCOPES, synonymsSetting } from "./indexes";
import { cleanQuery, MAX_QUERY } from "./query";

// Step 5.2 rules that need no engine: no price can reach a search document or an index setting; synonyms work both ways;
// every scope searches real indexes.

describe("no price in search", () => {
  it("keeps a product's allowed fields and drops price fields", () => {
    const doc = productDocument({
      id: "p1",
      title: "PEM Electrolyser 50 kW",
      meta: "Systems › Electrolysers · Hydrotek Systems",
      href: "/marketplace/p/pem-50",
      name: "PEM Electrolyser 50 kW",
      price: 4879400,
      pricePaise: 487940000,
      mrp: "₹48,79,400",
      attributes: { ratedPower: "50 kW", outputPressure: "30 bar" },
    });
    expect(doc).toEqual({
      id: "p1",
      title: "PEM Electrolyser 50 kW",
      meta: "Systems › Electrolysers · Hydrotek Systems",
      href: "/marketplace/p/pem-50",
      name: "PEM Electrolyser 50 kW",
      attributes: { ratedPower: "50 kW", outputPressure: "30 bar" },
    });
    expect(findPriceField(doc)).toBeNull();
  });

  it("refuses a price hidden inside an allowed field", () => {
    expect(() => productDocument({ id: "p2", title: "x", meta: "", href: "/", attributes: { unitCost: 12 } })).toThrow(
      /attributes\.unitCost/,
    );
    expect(() => productDocument({ id: "p3", title: "x", meta: "", href: "/", summary: "Now only ₹4,500" })).toThrow(
      /summary/,
    );
    expect(() =>
      productDocument({ id: "p4", title: "x", meta: "", href: "/", summary: "Rs. 5 lakh per unit" }),
    ).toThrow();
    expect(() =>
      productDocument({ id: "p5", title: "x", meta: "", href: "/", badges: [{ label: "Deal", priceInr: 1 }] }),
    ).toThrow(/badges\[0\]\.priceInr/);
  });

  it("no index searches, filters or sorts on a price", () => {
    for (const def of Object.values(SEARCH_INDEXES)) {
      for (const field of [...def.searchableAttributes, ...def.filterableAttributes, ...def.sortableAttributes]) {
        expect(PRICE_FIELD.test(field), `${def.uid}.${field}`).toBe(false);
      }
    }
  });
});

describe("index settings", () => {
  it("defines every index once, under its own uid", () => {
    for (const uid of SEARCH_INDEX_UIDS) expect(SEARCH_INDEXES[uid].uid).toBe(uid);
  });

  it("scopes only search indexes that exist, All first", () => {
    expect(SEARCH_SCOPES[0].id).toBe("all");
    for (const scope of SEARCH_SCOPES) {
      for (const uid of scope.indexes) expect(SEARCH_INDEX_UIDS).toContain(uid);
    }
  });

  it("makes synonyms mutual", () => {
    const s = synonymsSetting([
      ["h2", "hydrogen"],
      ["pem", "proton exchange membrane"],
    ]);
    expect(s.h2).toEqual(["hydrogen"]);
    expect(s.hydrogen).toEqual(["h2"]);
    expect(s["proton exchange membrane"]).toEqual(["pem"]);
  });
});

describe("queries", () => {
  it("trims, collapses spaces and caps the length", () => {
    expect(cleanQuery("  pem   electrolyser ")).toBe("pem electrolyser");
    expect(cleanQuery(null)).toBe("");
    expect(cleanQuery("x".repeat(500))).toHaveLength(MAX_QUERY);
  });

  it("makes the initials on the org card", () => {
    expect(initialsOf("Hydrotek Systems")).toBe("HS");
    expect(initialsOf("Sahyadri Electrolysers Pvt Ltd")).toBe("SE");
    expect(initialsOf("Pranava H2")).toBe("PH");
  });
});
