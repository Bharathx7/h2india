import { describe, expect, it } from "vitest";
import { coverTopic } from "./CoverArt";
import { equipmentKind } from "./EquipmentArt";

describe("equipmentKind", () => {
  it("draws every launch category as its own equipment", () => {
    expect(equipmentKind("electrolysers")).toBe("electrolyser");
    expect(equipmentKind("fuel-cell-systems")).toBe("fuel-cell");
    expect(equipmentKind("compression-systems")).toBe("compressor");
    expect(equipmentKind("refuelling-stations-modules")).toBe("dispenser");
    expect(equipmentKind("dispensers")).toBe("dispenser");
    expect(equipmentKind("storage-systems")).toBe("vessel");
    expect(equipmentKind("transport-trailers")).toBe("trailer");
    expect(equipmentKind("purification-treatment")).toBe("column");
    expect(equipmentKind("liquefaction")).toBe("exchanger");
    expect(equipmentKind("hydrogen-generators")).toBe("electrolyser");
    expect(equipmentKind("power-conversion-rectifiers")).toBe("rectifier");
    expect(equipmentKind("chp-units")).toBe("generator");
    expect(equipmentKind("tanks-cylinders")).toBe("cylinders");
    expect(equipmentKind("valves-regulators")).toBe("regulator");
    expect(equipmentKind("sensors-detectors")).toBe("sensor");
    expect(equipmentKind("testing-certification")).toBe("gauge");
    expect(equipmentKind("catalysts")).toBe("lattice");
  });

  it("reads a card's own words and falls back to the molecule", () => {
    expect(equipmentKind("Systems · Electrolysers", "PEM Electrolyser 1 MW")).toBe("electrolyser");
    expect(equipmentKind(null, undefined, "Something new")).toBe("molecule");
  });
});

describe("coverTopic", () => {
  it("matches the newsroom sections", () => {
    expect(coverTopic("Policy & regulation · 14 Nov 2026")).toBe("policy");
    expect(coverTopic("Tenders & awards")).toBe("tenders");
    expect(coverTopic("Projects & investment")).toBe("projects");
    expect(coverTopic("Technology")).toBe("technology");
    expect(coverTopic("Mobility")).toBe("mobility");
    expect(coverTopic("Markets & prices")).toBe("markets");
    expect(coverTopic("Global to India")).toBe("global");
    expect(coverTopic("Press release")).toBe("press");
    expect(coverTopic("Insights")).toBe("general");
  });
});
