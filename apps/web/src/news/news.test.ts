import { describe, expect, it } from "vitest";
import type { Article } from "../payload-types";
import { clock, clock12, eyebrow, istDayKey, shortName, weekdayDay, type EyebrowStory } from "./format";
import { structuredData } from "./jsonld";

// Step 5.3: eyebrows and times as drawn (Article card v2 152:241, Today in Indian hydrogen 428:680), and the NewsArticle
// structured data on article pages.

const story = (over: Partial<EyebrowStory> = {}): EyebrowStory => ({
  kind: "article",
  type: "news",
  typeLabel: "News",
  level: null,
  issuer: null,
  section: { name: "Policy & regulation", slug: "policy" },
  publishedAt: "2026-11-08T04:30:00.000Z",
  ...over,
});

describe("eyebrows", () => {
  it("shows the section's short name on news cards and the full name on the lead story", () => {
    expect(eyebrow(story())).toBe("Policy · 8 Nov 2026");
    expect(eyebrow(story(), { fullSection: true })).toBe("Policy & regulation · 8 Nov 2026");
  });

  it("shows the type and reader level for analysis, explainers and guides", () => {
    expect(eyebrow(story({ type: "analysis", typeLabel: "Analysis", level: "Expert" }))).toBe(
      "Analysis · Expert · 8 Nov 2026",
    );
    expect(eyebrow(story({ kind: "guide", type: "guide", typeLabel: "Guide", level: "Beginner" }))).toBe(
      "Guide · Beginner · 8 Nov 2026",
    );
  });

  it("names the issuer of a press release", () => {
    expect(eyebrow(story({ type: "press_release", typeLabel: "Press release", issuer: "Hydrotek Systems" }))).toBe(
      "Hydrotek Systems · 8 Nov 2026",
    );
  });

  it("falls back to News for a story outside any section", () => {
    expect(eyebrow(story({ section: null }))).toBe("News · 8 Nov 2026");
    expect(shortName("Global to India")).toBe("Global to India");
  });
});

describe("India time", () => {
  it("shows times and days in IST, whatever the server's zone", () => {
    // 18:15 UTC on 9 Nov is 23:45 on 9 Nov in India; 18:45 UTC is already 10 Nov.
    expect(clock("2026-11-09T18:15:00.000Z")).toBe("23:45");
    expect(istDayKey("2026-11-09T18:45:00.000Z")).toBe("2026-11-10");
    expect(weekdayDay("2026-11-10T06:00:00.000Z")).toBe("Tue 10 Nov");
    expect(clock12("2026-11-12T09:12:00.000Z")).toBe("2:42 PM");
  });
});

describe("structured data", () => {
  const base = {
    id: 1,
    title: "SECI opens bids for green ammonia under SIGHT Tranche II",
    slug: "seci-opens-bids",
    dek: "The second green ammonia round asks producers to quote a delivered price.",
    type: "news",
    publishedAt: "2026-11-10T05:00:00.000Z",
    createdAt: "2026-11-10T04:00:00.000Z",
    updatedAt: "2026-11-10T06:35:00.000Z",
    topics: [{ id: 3, name: "Tenders & awards", slug: "tenders-awards", order: 3 }],
    authors: [{ id: 2, name: "Ananya Rao", slug: "ananya-rao", kind: "staff" }],
  } as unknown as Article;

  it("describes a news article with its author and section", () => {
    const data = structuredData(base, "https://h2india.example/news/seci-opens-bids");
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: base.title,
      datePublished: "2026-11-10T05:00:00.000Z",
      dateModified: "2026-11-10T06:35:00.000Z",
      articleSection: "Tenders & awards",
      author: [{ "@type": "Person", name: "Ananya Rao", url: "https://h2india.example/authors/ananya-rao" }],
      publisher: { "@type": "Organization", name: "H2 India" },
    });
  });

  it("credits a press release to its issuer and names a sponsor", () => {
    const pr = structuredData({ ...base, type: "press_release", issuer: "Hydrotek Systems" }, "https://x.in/n");
    expect(pr.author).toEqual([{ "@type": "Organization", name: "Hydrotek Systems" }]);
    const sp = structuredData({ ...base, type: "sponsored", sponsor: { name: "Hydrotek Systems" } }, "https://x.in/n");
    expect(sp).toMatchObject({ sponsor: { "@type": "Organization", name: "Hydrotek Systems" } });
  });
});
