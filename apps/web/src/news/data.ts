import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload, type Where } from "payload";
import { NEWS_TAG } from "@/cms/newsroom";
import { STATE_OPTIONS } from "@/cms/records/common";
import { publicWhere } from "@/cms/sample";
import { typeBadge } from "@/cms/types";
import type { Article, Author, Grant, Guide, Scheme, Tag, Tender, Topic } from "@/payload-types";
import { typeLabel } from "./format";

export { clock, clock12, dayMonthYear, istDayKey, shortName, typeLabel, weekdayDay } from "./format";

// The public newsroom's reads (step 5.3). Only what readers may see: published, and not sample where samples are hidden
// (A37). Every read is cached under NEWS_TAG; the CMS refreshes that tag the moment an article, guide, topic, tag or
// author changes (cms/newsroom.ts), and the cache also expires on its own after five minutes as a safety net.

const DAY = 86_400_000;
const SAFETY_NET_SECONDS = 300;

const payload = () => getPayload({ config });

/** Bumped when a read's filters change meaning, so entries cached under the old meaning are never served. */
const CACHE_VERSION = 2;

/** Caches a read under the newsroom tag. The arguments are part of the key. */
function cached<A extends unknown[], R>(name: string, read: (...args: A) => Promise<R>) {
  return unstable_cache(read, [`news:v${String(CACHE_VERSION)}:${name}`], {
    tags: [NEWS_TAG],
    revalidate: SAFETY_NET_SECONDS,
  });
}

/** Words in a Lexical body, for "Read · 7 min". */
function wordsIn(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const n = node as { text?: unknown; children?: unknown[]; root?: unknown };
  let count = typeof n.text === "string" ? n.text.split(/\s+/).filter(Boolean).length : 0;
  if (n.root) count += wordsIn(n.root);
  for (const c of n.children ?? []) count += wordsIn(c);
  return count;
}

export const readMinutes = (body: unknown) => Math.max(1, Math.ceil(wordsIn(body) / 200));

export interface SectionLink {
  name: string;
  slug: string;
  href: string;
  description: string | null;
}

/** What a card or list row needs about an article (Article card v2, 152:241). */
export interface ArticleSummary {
  id: number;
  kind: "article" | "guide";
  title: string;
  href: string;
  dek: string;
  type: string;
  typeLabel: string;
  /** Sponsored or Press release: always shown (A28). */
  badge: string | null;
  section: { name: string; slug: string } | null;
  publishedAt: string;
  minutes: number;
  authors: string[];
  level: string | null;
  issuer: string | null;
  live: "live" | "ended" | null;
}

const asObjects = <T extends object>(rel: unknown): T[] =>
  Array.isArray(rel) ? rel.filter((r): r is T => Boolean(r) && typeof r === "object") : [];

/** The article's news section: the first of its topics that is a section (has an order). */
function sectionOf(topics: unknown): { name: string; slug: string } | null {
  const t = asObjects<Topic>(topics).find((x) => typeof x.order === "number");
  return t ? { name: t.name, slug: t.slug } : null;
}

export function summarise(a: Article): ArticleSummary {
  const live = a.live?.status === "live" || a.live?.status === "ended" ? a.live.status : null;
  return {
    id: a.id,
    kind: "article",
    title: a.title,
    href: `/news/${a.slug}`,
    dek: a.dek,
    type: a.type,
    typeLabel: typeLabel(a.type),
    badge: typeBadge(a.type),
    section: sectionOf(a.topics),
    publishedAt: a.publishedAt ?? a.createdAt,
    minutes: readMinutes(a.body),
    authors: asObjects<Author>(a.authors).map((x) => x.name),
    level: a.level ?? null,
    issuer: a.issuer ?? null,
    live,
  };
}

function summariseGuide(g: Guide): ArticleSummary {
  return {
    id: g.id,
    kind: "guide",
    title: g.title,
    href: `/knowledge/insights/${g.slug}`,
    dek: g.summary,
    type: "guide",
    typeLabel: "Guide",
    badge: null,
    section: sectionOf(g.topics),
    publishedAt: g.updatedAt,
    minutes: readMinutes(g.body),
    authors: asObjects<Author>(g.authors).map((x) => x.name),
    level: g.level ?? null,
    issuer: null,
    live: null,
  };
}

// ---------- sections, topics, tags, authors

export const getSections = cached("sections", async (): Promise<SectionLink[]> => {
  const res = await (
    await payload()
  ).find({ collection: "topics", where: { order: { exists: true } }, sort: "order", limit: 50, depth: 0 });
  return res.docs
    .filter((t) => typeof t.order === "number")
    .map((t) => ({ name: t.name, slug: t.slug, href: `/news/${t.slug}`, description: t.description ?? null }));
});

export const getTopic = cached("topic", async (slug: string): Promise<Topic | null> => {
  const res = await (await payload()).find({ collection: "topics", where: { slug: { equals: slug } }, limit: 1 });
  return res.docs[0] ?? null;
});

export const getTag = cached("tag", async (slug: string): Promise<Tag | null> => {
  const res = await (await payload()).find({ collection: "tags", where: { slug: { equals: slug } }, limit: 1 });
  return res.docs[0] ?? null;
});

export const getAuthor = cached("author", async (slug: string): Promise<Author | null> => {
  const res = await (await payload()).find({ collection: "authors", where: { slug: { equals: slug } }, limit: 1 });
  return res.docs[0] ?? null;
});

// ---------- article lists

export interface ArticleFilter {
  topic?: string;
  tag?: string;
  author?: string;
  /** Only these types. */
  types?: string[];
  /** Not these types. */
  notTypes?: string[];
  /** A state value from STATE_OPTIONS; national stories (no state) are included unless stateOnly. */
  state?: string;
  stateOnly?: boolean;
  featured?: boolean;
  exclude?: number[];
  page?: number;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

async function relationId(collection: "topics" | "tags" | "authors", slug: string): Promise<number | null> {
  const res = await (await payload()).find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 });
  return res.docs[0]?.id ?? null;
}

async function articleWhere(f: ArticleFilter): Promise<Where | null> {
  const parts: Where[] = [publicWhere()];
  if (f.topic) {
    const id = await relationId("topics", f.topic);
    if (id === null) return null;
    parts.push({ topics: { in: [id] } });
  }
  if (f.tag) {
    const id = await relationId("tags", f.tag);
    if (id === null) return null;
    parts.push({ tags: { in: [id] } });
  }
  if (f.author) {
    const id = await relationId("authors", f.author);
    if (id === null) return null;
    parts.push({ authors: { in: [id] } });
  }
  if (f.types?.length) parts.push({ type: { in: f.types } });
  if (f.notTypes?.length) parts.push({ type: { not_in: f.notTypes } });
  if (f.state && STATE_OPTIONS.some((o) => o.value === f.state)) {
    parts.push(
      f.stateOnly
        ? { states: { in: [f.state] } }
        : { or: [{ states: { in: [f.state, "all-india"] } }, { states: { exists: false } }] },
    );
  }
  if (f.featured) parts.push({ featured: { equals: true } });
  if (f.exclude?.length) parts.push({ id: { not_in: f.exclude } });
  return { and: parts };
}

export const listArticles = cached("list", async (f: ArticleFilter): Promise<Page<ArticleSummary>> => {
  const where = await articleWhere(f);
  if (!where) return { items: [], total: 0, page: 1, totalPages: 0 };
  const res = await (
    await payload()
  ).find({
    collection: "articles",
    where,
    sort: "-publishedAt",
    limit: f.limit ?? 20,
    page: Math.max(1, f.page ?? 1),
    depth: 1,
  });
  return { items: res.docs.map(summarise), total: res.totalDocs, page: res.page ?? 1, totalPages: res.totalPages };
});

/** One article for its page, with everything the page shows; null when readers can't see it. */
export const getArticle = cached("article", async (slug: string): Promise<Article | null> => {
  const res = await (
    await payload()
  ).find({
    collection: "articles",
    where: { and: [publicWhere(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 2,
  });
  return res.docs[0] ?? null;
});

/** Stories that share a topic with this one, newest first (Related stories, 434:3289). */
export const relatedArticles = cached(
  "related",
  async (id: number, topicIds: number[], max?: number): Promise<ArticleSummary[]> => {
    const limit = max ?? 4;
    const p = await payload();
    const near = topicIds.length
      ? await p.find({
          collection: "articles",
          where: { and: [publicWhere(), { id: { not_equals: id } }, { topics: { in: topicIds } }] },
          sort: "-publishedAt",
          limit,
          depth: 1,
        })
      : { docs: [] as Article[] };
    const items = near.docs.map(summarise);
    if (items.length >= limit) return items;
    const more = await p.find({
      collection: "articles",
      where: { and: [publicWhere(), { id: { not_in: [id, ...items.map((i) => i.id)] } }] },
      sort: "-publishedAt",
      limit: limit - items.length,
      depth: 1,
    });
    return [...items, ...more.docs.map(summarise)];
  },
);

// ---------- Insights (440:40): guides plus analysis and explainer articles (A55)

export const INSIGHT_TYPES = ["analysis", "explainer"];

export interface InsightFilter {
  topic?: string;
  level?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
}

export const listInsights = cached("insights", async (f: InsightFilter): Promise<Page<ArticleSummary>> => {
  const p = await payload();
  const extra: Where[] = [];
  if (f.topic) {
    const id = await relationId("topics", f.topic);
    if (id === null) return { items: [], total: 0, page: 1, totalPages: 0 };
    extra.push({ topics: { in: [id] } });
  }
  if (f.level) extra.push({ level: { equals: f.level } });
  // Both lists are small (editorial pieces), so they're merged and paged here.
  const [articles, guides] = await Promise.all([
    p.find({
      collection: "articles",
      where: { and: [publicWhere(), { type: { in: INSIGHT_TYPES } }, ...extra] },
      sort: "-publishedAt",
      limit: 500,
      depth: 1,
    }),
    p.find({
      collection: "guides",
      where: { and: [publicWhere(), ...extra] },
      sort: "-updatedAt",
      limit: 500,
      depth: 1,
    }),
  ]);
  const all = [...articles.docs.map(summarise), ...guides.docs.map(summariseGuide)].sort((a, b) =>
    f.sort === "oldest" ? a.publishedAt.localeCompare(b.publishedAt) : b.publishedAt.localeCompare(a.publishedAt),
  );
  const limit = f.limit ?? 6;
  const totalPages = Math.ceil(all.length / limit);
  const page = Math.min(Math.max(1, f.page ?? 1), Math.max(1, totalPages));
  return { items: all.slice((page - 1) * limit, page * limit), total: all.length, page, totalPages };
});

/** The topics Insights pieces sit in, for the filter chips (440:40). */
export const insightTopics = cached("insight-topics", async (): Promise<{ name: string; slug: string }[]> => {
  const p = await payload();
  const [topics, articles, guides] = await Promise.all([
    p.find({ collection: "topics", limit: 100, depth: 0, sort: "order" }),
    p.find({
      collection: "articles",
      where: { and: [publicWhere(), { type: { in: INSIGHT_TYPES } }] },
      limit: 500,
      depth: 0,
    }),
    p.find({ collection: "guides", where: publicWhere(), limit: 500, depth: 0 }),
  ]);
  const used = new Set<number>();
  for (const d of [...articles.docs, ...guides.docs]) {
    for (const t of d.topics ?? []) used.add(typeof t === "object" ? t.id : t);
  }
  return topics.docs.filter((t) => used.has(t.id)).map((t) => ({ name: t.name, slug: t.slug }));
});

export const getGuide = cached("guide", async (slug: string): Promise<Guide | null> => {
  const res = await (
    await payload()
  ).find({ collection: "guides", where: { and: [publicWhere(), { slug: { equals: slug } }] }, limit: 1, depth: 2 });
  return res.docs[0] ?? null;
});

// ---------- Closing this week (428:904): tenders, schemes and grants with a deadline in the next seven days

export interface Deadline {
  kind: string;
  title: string;
  href: string;
  daysLeft: number;
}

export const closingThisWeek = cached("closing", async (nowIso: string, max?: number): Promise<Deadline[]> => {
  const limit = max ?? 3;
  const now = new Date(nowIso);
  const until = new Date(now.getTime() + 7 * DAY).toISOString();
  const window = (field: string): Where => ({
    and: [publicWhere(), { [field]: { greater_than_equal: now.toISOString() } }, { [field]: { less_than: until } }],
  });
  const p = await payload();
  const [tenders, schemes, grants] = await Promise.all([
    p.find({ collection: "tenders", where: window("bidDueAt"), sort: "bidDueAt", limit, depth: 0 }),
    p.find({ collection: "schemes", where: window("nextDeadline"), sort: "nextDeadline", limit, depth: 0 }),
    p.find({ collection: "grants", where: window("deadline"), sort: "deadline", limit, depth: 0 }),
  ]);
  const days = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY));
  const rows: (Deadline & { at: string })[] = [
    ...tenders.docs.map((t: Tender) => ({
      kind: `Tender · ${t.issuer.split(/[,(]/)[0]?.trim() ?? t.issuer}`,
      title: t.title,
      href: `/opportunities/tenders/${t.slug}`,
      at: t.bidDueAt,
      daysLeft: days(t.bidDueAt),
    })),
    ...schemes.docs.flatMap((s: Scheme) =>
      s.nextDeadline
        ? [
            {
              kind: `Scheme · ${s.runBy.split(/[,(]/)[0]?.trim() ?? s.runBy}`,
              title: s.name,
              href: `/opportunities/schemes/${s.slug}`,
              at: s.nextDeadline,
              daysLeft: days(s.nextDeadline),
            },
          ]
        : [],
    ),
    ...grants.docs.map((g: Grant) => ({
      kind: `Grant · ${g.funder}`,
      title: g.title,
      href: `/opportunities/grants/${g.slug}`,
      at: g.deadline,
      daysLeft: days(g.deadline),
    })),
  ];
  return rows
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, limit)
    .map((r) => ({ kind: r.kind, title: r.title, href: r.href, daysLeft: r.daysLeft }));
});

// ---------- a topic's schemes, tenders and glossary terms (442:4049)

export interface TopicRecord {
  kind: string;
  title: string;
  href: string;
  status: string | null;
}

export const topicRecords = cached("topic-records", async (topicId: number): Promise<TopicRecord[]> => {
  const p = await payload();
  const where: Where = { and: [publicWhere(), { topics: { in: [topicId] } }] };
  const [schemes, tenders] = await Promise.all([
    p.find({ collection: "schemes", where, sort: "nextDeadline", limit: 3, depth: 0 }),
    p.find({ collection: "tenders", where, sort: "bidDueAt", limit: 3, depth: 0 }),
  ]);
  return [
    ...schemes.docs.map((s: Scheme) => ({
      kind: `Scheme · ${s.runBy.split(/[,(]/)[0]?.trim() ?? s.runBy}`,
      title: s.name,
      href: `/opportunities/schemes/${s.slug}`,
      status: s.status ?? null,
    })),
    ...tenders.docs.map((t: Tender) => ({
      kind: `Tender · ${t.issuer.split(/[,(]/)[0]?.trim() ?? t.issuer}`,
      title: t.title,
      href: `/opportunities/tenders/${t.slug}`,
      status: t.status ?? null,
    })),
  ];
});

export const topicGlossary = cached(
  "topic-glossary",
  async (topicId: number): Promise<{ term: string; slug: string }[]> => {
    const res = await (
      await payload()
    ).find({
      collection: "glossary",
      where: { and: [publicWhere(), { topics: { in: [topicId] } }] },
      sort: "term",
      limit: 12,
      depth: 0,
    });
    return res.docs.map((g) => ({ term: g.term, slug: g.slug }));
  },
);

/** The sections an author has written in, for "Covers" (444:5431). */
export const authorCovers = cached("author-covers", async (authorSlug: string): Promise<SectionLink[]> => {
  const list = await listArticles({ author: authorSlug, limit: 100 });
  const seen = new Map<string, SectionLink>();
  for (const a of list.items) {
    if (a.section && !seen.has(a.section.slug)) {
      seen.set(a.section.slug, {
        name: a.section.name,
        slug: a.section.slug,
        href: `/news/${a.section.slug}`,
        description: null,
      });
    }
  }
  return [...seen.values()];
});
