import { describe, expect, it } from "vitest";
import {
  canRequestQuote,
  FOOTER_COLUMNS,
  footerFor,
  footerWithoutQuote,
  knowledgePromo,
  MEGA_MENUS,
  menusFor,
  menusWithoutQuote,
  SITE_LINKS,
} from "./site-nav";

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

// Public QC (16 Nov 2026): the top strip adds For Members. Founder QC (17 Nov 2026): the Directory is for members
// and staff only; buyers and suppliers join as members to see it.
describe("the Directory in the menus", () => {
  const links = (directory: boolean) => footerFor(FOOTER_COLUMNS, directory).flatMap((c) => c.links.map((l) => l.href));

  it("is left out of the menus and the footer for visitors, buyers and suppliers who aren't members", () => {
    expect(menusFor(MEGA_MENUS, false).map((m) => m.id)).not.toContain("directory");
    expect(links(false).filter((h) => h.startsWith("/directory"))).toEqual([]);
  });

  it("is there for members and staff", () => {
    expect(menusFor(MEGA_MENUS, true).map((m) => m.id)).toContain("directory");
    expect(links(true)).toContain("/directory");
  });

  it("the top strip reads For Buyers, For Members, For Suppliers", () => {
    expect(SITE_LINKS.secondary.slice(0, 3).map((l) => l.label)).toEqual([
      "For Buyers",
      "For Members",
      "For Suppliers",
    ]);
  });
});

// Public QC 4 (16 Nov 2026): Request a quote is for buyers.
describe("Request a quote", () => {
  it("shows to signed-out visitors and buyers only", () => {
    expect(canRequestQuote(null)).toBe(true);
    expect(canRequestQuote({ workspaceHref: "/buyer" })).toBe(true);
    for (const area of ["/supplier", "/member", "/admin"]) expect(canRequestQuote({ workspaceHref: area })).toBe(false);
  });

  it("leaves the Marketplace menu and the footer for everyone else", () => {
    const hrefs = [
      ...menusWithoutQuote(MEGA_MENUS).flatMap((m) => (m.tools ?? []).map((t) => t.href)),
      ...footerWithoutQuote(FOOTER_COLUMNS).flatMap((c) => c.links.map((l) => l.href)),
    ];
    expect(hrefs).not.toContain("/rfq/new");
    expect(MEGA_MENUS.flatMap((m) => (m.tools ?? []).map((t) => t.href))).toContain("/rfq/new");
  });
});
