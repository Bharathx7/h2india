import { describe, expect, it } from "vitest";
import {
  canRequestQuote,
  FOOTER_COLUMNS,
  footerWithoutQuote,
  knowledgePromo,
  MEGA_MENUS,
  menusWithoutListCompany,
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

// Public QC (16 Nov 2026): the top strip adds For Members. Founder (18 Nov 2026): the Directory lives only in the
// member workspace, so the website never links to it, for members too. A single company profile stays linked.
describe("the Directory on the website", () => {
  const hrefs = [
    ...MEGA_MENUS.flatMap((m) => [
      ...(m.primary ?? []).map((l) => l.href),
      ...(m.links ?? []).map((l) => l.href),
      ...(m.tools ?? []).map((l) => l.href),
    ]),
    ...FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href)),
  ];

  it("has no menu", () => {
    expect(MEGA_MENUS.map((m) => m.id)).not.toContain("directory");
  });

  it("isn't linked from the menus or the footer", () => {
    expect(hrefs.filter((h) => h.startsWith("/directory") || h.startsWith("/member/directory"))).toEqual([]);
  });

  it("the top strip reads For Buyers, For Members, For Suppliers, Pricing and nothing else", () => {
    expect(SITE_LINKS.secondary.map((l) => l.label)).toEqual(["For Buyers", "For Members", "For Suppliers", "Pricing"]);
  });

  it("Advertise and Newsletter are in the News menu, List your company in the Marketplace tools", () => {
    const news = MEGA_MENUS.find((m) => m.id === "news")?.links?.map((l) => l.href) ?? [];
    expect(news).toEqual(expect.arrayContaining(["/advertise", "/newsletter"]));
    const tools = MEGA_MENUS.find((m) => m.id === "marketplace")?.tools?.map((t) => t.href) ?? [];
    expect(tools).toContain(SITE_LINKS.listCompany);
    const signedIn = menusWithoutListCompany(MEGA_MENUS).find((m) => m.id === "marketplace")?.tools ?? [];
    expect(signedIn.map((t) => t.href)).not.toContain(SITE_LINKS.listCompany);
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
