import { describe, expect, it } from "vitest";
import { knowledgePromo, MEGA_MENUS } from "./site-nav";

// Public QC (16 Nov 2026): the Knowledge menu's card was empty.
describe("the Knowledge menu card", () => {
  it("shows a tracker figure with its source and date", () => {
    const promo = knowledgePromo({
      value: "8.62 lakh",
      label: "t/yr of green H₂ awarded",
      source: "SECI · SIGHT tranches",
      asOf: "2026-11-12T00:00:00.000Z",
    });
    expect(promo).toMatchObject({
      eyebrow: "India Hydrogen Tracker",
      title: "8.62 lakh t/yr of green H₂ awarded",
      action: { href: "/tracker" },
    });
    expect(promo.text).toBe("SECI · SIGHT tranches · as of 12 Nov 2026");
  });

  it("falls back to Hydrogen 101 when no figure is published, or one lacks its source", () => {
    expect(knowledgePromo(null).action.href).toBe("/knowledge/hydrogen-101");
    expect(knowledgePromo({ value: "5", label: "MW", source: " ", asOf: "2026-11-12" }).title).toBe("Hydrogen 101");
  });

  it("every other menu keeps its own card", () => {
    expect(MEGA_MENUS.filter((m) => m.id !== "knowledge" && m.id !== "marketplace").every((m) => m.promo)).toBe(true);
  });
});
