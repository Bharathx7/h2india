import config from "@payload-config";
import { getDb } from "@h2india/core";
import { publicCatalogue, type PublicCatalogue } from "@h2india/core/catalogue/taxonomy";
import type { CompanyDocument } from "@h2india/core/search";
import { getPayload, type Where } from "payload";
import { cache } from "react";
import { publicWhere, showSample } from "@/cms/sample";
import { listArticles, topicRecords, type ArticleSummary, type TopicRecord } from "@/news/data";
import { companiesFor } from "@/opportunities/data";
import type { ApplicationPage, Event, Guide, Topic } from "@/payload-types";

// Public reads for the marketplace pages (step 6.2). The catalogue comes from core (hidden and, in production,
// sample categories left out); application words from the CMS; suppliers from the company directory; schemes,
// tenders, events and news from the topics an editor picks for the application. Read per request.

export const catalogue = cache((): Promise<PublicCatalogue> =>
  publicCatalogue(getDb(), { includeSample: showSample() }),
);

const payload = () => getPayload({ config });

/** The published page for an application, or null (the template then shows its categories only). */
export const applicationPage = cache(async (id: string): Promise<ApplicationPage | null> => {
  const p = await payload();
  const found = await p.find({
    collection: "application-pages",
    where: { and: [publicWhere(), { application: { equals: id } }] },
    limit: 1,
    depth: 1,
  });
  return found.docs[0] ?? null;
});

export interface ApplicationLists {
  records: TopicRecord[];
  news: ArticleSummary[];
  events: Event[];
}

const topicsOf = (page: ApplicationPage): Topic[] =>
  (page.topics ?? []).filter((t): t is Topic => typeof t === "object");

/** Schemes and tenders, latest news and upcoming events on the page's topics (754:14685). */
export async function applicationLists(page: ApplicationPage | null, now = new Date()): Promise<ApplicationLists> {
  const topics = page ? topicsOf(page) : [];
  if (!topics.length) return { records: [], news: [], events: [] };
  const p = await payload();
  const where: Where = {
    and: [
      publicWhere(),
      { topics: { in: topics.map((t) => t.id) } },
      { startsAt: { greater_than_equal: now.toISOString() } },
    ],
  };
  const [records, news, events] = await Promise.all([
    Promise.all(topics.map((t) => topicRecords(t.id))),
    Promise.all(topics.map((t) => listArticles({ topic: t.slug, limit: 2 }))),
    p.find({ collection: "events", where, sort: "startsAt", limit: 2, depth: 0 }),
  ]);
  const uniq = <T>(items: T[], key: (i: T) => string) => [...new Map(items.map((i) => [key(i), i])).values()];
  return {
    records: uniq(records.flat(), (r) => r.href).slice(0, 3),
    news: uniq(
      news.flatMap((n) => n.items),
      (a) => a.href,
    )
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 2),
    events: events.docs,
  };
}

/** Suppliers whose profile names any of these categories, verified first (391:4379 Top suppliers, 754:14685). */
export const suppliersFor = (labels: string[], limit: number): Promise<CompanyDocument[]> =>
  companiesFor(labels, limit);

/**
 * Published buyer's guides (guides with product categories, step 5.6), newest first; with words, only those whose
 * categories or title name one of them (390:8256, 391:4379).
 */
export async function guidesFor(words: string[], limit = 3): Promise<Guide[]> {
  const p = await payload();
  const where: Where = { and: [publicWhere(), { productCategories: { exists: true } }] };
  const found = await p.find({ collection: "guides", where, sort: "-updatedAt", limit: 50, depth: 0 });
  const needles = words.map((w) => w.toLowerCase());
  const matches = (g: Guide) =>
    !needles.length ||
    needles.some((n) => [g.title, ...(g.productCategories ?? [])].join(" ").toLowerCase().includes(n));
  return found.docs
    .filter((g) => g.productCategories?.length)
    .filter(matches)
    .slice(0, limit);
}
