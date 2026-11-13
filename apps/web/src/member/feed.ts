import config from "@payload-config";
import { getDb } from "@h2india/core";
import { companyProfile } from "@h2india/core/companies";
import { listFollows } from "@h2india/core/members";
import { TOPICS } from "@h2india/core/members/rules";
import { productDetail, storefrontProducts } from "@h2india/core/products";
import type { SaveInput } from "@h2india/core/members";
import { getPayload, type Where } from "payload";
import { publicWhere, showSample } from "@/cms/sample";
import { listArticles } from "@/news/data";
import { dayMonthYear } from "@/news/format";
import type { Topic } from "@/payload-types";

// The member home feed (532:9; empty 532:629), step 7.2: new and updated public records that match what the member
// follows, newest first, with no ranking until one is designed (A149). Each item says why it is there.

export const FEED_KINDS = [
  { value: "", label: "All" },
  { value: "article", label: "Articles" },
  { value: "tender", label: "Tenders" },
  { value: "scheme", label: "Schemes and calls" },
  { value: "event", label: "Events" },
  { value: "company", label: "Company updates" },
] as const;

export interface FeedItem {
  key: string;
  kind: "article" | "tender" | "scheme" | "grant" | "event" | "job" | "company";
  title: string;
  href: string;
  eyebrow: string;
  meta: string;
  date: string;
  because: string;
}

const slugOfState = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const topicSlugs = (t: (number | Topic)[] | null | undefined) =>
  (t ?? []).flatMap((x) => (typeof x === "object" ? [x.slug] : []));

export async function buildFeed(
  userId: string,
): Promise<{ items: FeedItem[]; summary: { topics: number; states: number; companies: number } }> {
  const db = getDb();
  const follows = await listFollows(db, userId);
  const topics = follows
    .filter((f) => f.targetType === "topic")
    .map((f) => TOPICS.find((t) => t.value === f.targetId))
    .filter((t) => t !== undefined);
  const states = follows.filter((f) => f.targetType === "state").map((f) => f.targetId);
  const companies = follows.filter((f) => f.targetType === "company");
  const summary = { topics: topics.length, states: states.length, companies: companies.length };
  if (!follows.length) return { items: [], summary };

  const allIndia = states.includes("All of India");
  /** Why a record with these words, newsroom topics and states is in the feed, or null. */
  const reason = (text: string, newsTopics: string[], recordStates: string[], kind?: string): string | null => {
    const lower = text.toLowerCase();
    for (const t of topics) {
      if (
        (kind && (t.kinds as readonly string[]).includes(kind)) ||
        t.news.some((n) => newsTopics.includes(n)) ||
        t.words.some((w) => lower.includes(w))
      ) {
        return t.label;
      }
    }
    const st = states.find((s) => s !== "All of India" && recordStates.includes(slugOfState(s)));
    if (st) return st;
    if (allIndia && recordStates.includes("all-india")) return "All of India";
    return null;
  };

  const p = await getPayload({ config });
  const where: Where = publicWhere();
  const [articles, tenders, schemes, grants, events, jobs] = await Promise.all([
    listArticles({ limit: 40 }),
    p.find({ collection: "tenders", where, sort: "-updatedAt", limit: 40, depth: 1 }),
    p.find({ collection: "schemes", where, sort: "-updatedAt", limit: 40, depth: 1 }),
    p.find({ collection: "grants", where, sort: "-updatedAt", limit: 40, depth: 1 }),
    p.find({
      collection: "events",
      where: { and: [where, { startsAt: { greater_than_equal: new Date().toISOString() } }] },
      sort: "startsAt",
      limit: 40,
      depth: 1,
    }),
    p.find({ collection: "jobs", where, sort: "-updatedAt", limit: 40, depth: 0 }),
  ]);
  const items: FeedItem[] = [];
  for (const a of articles.items) {
    const byCompany = companies.find((c) => a.title.toLowerCase().includes(c.label.toLowerCase()));
    const why = byCompany?.label ?? reason(`${a.title} ${a.dek}`, a.section ? [a.section.slug] : [], []);
    if (why)
      items.push({
        key: `a${String(a.id)}`,
        kind: "article",
        title: a.title,
        href: a.href,
        eyebrow: a.typeLabel,
        meta: dayMonthYear(a.publishedAt),
        date: a.publishedAt,
        because: why,
      });
  }
  for (const t of tenders.docs) {
    const why = reason(`${t.title} ${t.issuer}`, topicSlugs(t.topics), t.states ?? [], "tender");
    if (why)
      items.push({
        key: `t${String(t.id)}`,
        kind: "tender",
        title: t.title,
        href: `/opportunities/tenders/${t.slug}`,
        eyebrow: t.issuerName ?? t.issuer,
        meta: `Bids due ${dayMonthYear(t.bidDueAt)}`,
        date: t.publishedAt ?? t.updatedAt,
        because: why,
      });
  }
  for (const s of schemes.docs) {
    const why = reason(s.name, topicSlugs(s.topics), s.states ?? [], "scheme");
    if (why)
      items.push({
        key: `s${String(s.id)}`,
        kind: "scheme",
        title: s.name,
        href: `/opportunities/schemes/${s.slug}`,
        eyebrow: "Scheme",
        meta: s.status ?? "",
        date: s.updatedAt,
        because: why,
      });
  }
  for (const g of grants.docs) {
    const why = reason(`${g.title} ${g.funder}`, topicSlugs(g.topics), g.states ?? [], "grant");
    if (why)
      items.push({
        key: `g${String(g.id)}`,
        kind: "grant",
        title: g.title,
        href: `/opportunities/grants/${g.slug}`,
        eyebrow: g.funderName ?? g.funder,
        meta: `Closes ${dayMonthYear(g.deadline)}`,
        date: g.updatedAt,
        because: why,
      });
  }
  for (const e of events.docs) {
    const why = reason(e.name, topicSlugs(e.topics), e.states ?? []);
    if (why)
      items.push({
        key: `e${String(e.id)}`,
        kind: "event",
        title: e.name,
        href: `/events/${e.slug}`,
        eyebrow: [dayMonthYear(e.startsAt), e.city].filter(Boolean).join(" · "),
        meta: "",
        date: e.updatedAt,
        because: why,
      });
  }
  for (const j of jobs.docs) {
    const byCompany = companies.find((c) => j.company.toLowerCase() === c.label.toLowerCase());
    const why = byCompany?.label ?? reason(j.role, topicSlugs(j.topics), j.states ?? [], "job");
    if (why)
      items.push({
        key: `j${String(j.id)}`,
        kind: "job",
        title: j.role,
        href: `/opportunities/jobs/${j.slug}`,
        eyebrow: `${j.company} posted a job`,
        meta: `Closes ${dayMonthYear(j.closesAt)}`,
        date: j.updatedAt,
        because: why,
      });
  }
  // Company updates: new live products from followed companies.
  for (const c of companies) {
    for (const prod of (await storefrontProducts(db, c.targetId, { includeSample: showSample() })).slice(0, 3)) {
      items.push({
        key: `p${prod.id}`,
        kind: "company",
        title: prod.name,
        href: prod.href,
        eyebrow: `${c.label} listed a product`,
        meta: prod.eyebrow,
        date: new Date(0).toISOString(),
        because: c.label,
      });
    }
  }
  const seen = new Set<string>();
  return {
    items: items
      .filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50),
    summary,
  };
}

/** What a "Save" link points at (?job=slug, ?tender=slug …), as a saved item; null when it isn't public. */
export async function resolveSave(type: string, key: string): Promise<SaveInput | null> {
  const p = await getPayload({ config });
  const one = async (collection: "tenders" | "schemes" | "grants" | "events" | "jobs" | "articles") =>
    (await p.find({ collection, where: { and: [publicWhere(), { slug: { equals: key } }] }, limit: 1, depth: 0 }))
      .docs[0];
  switch (type) {
    case "tender": {
      const t = await one("tenders");
      return t && "title" in t && "bidDueAt" in t
        ? {
            targetType: "tender",
            targetId: t.slug,
            title: t.title,
            href: `/opportunities/tenders/${t.slug}`,
            meta: `Tender · bids due ${dayMonthYear(t.bidDueAt)}`,
          }
        : null;
    }
    case "scheme": {
      const s = await one("schemes");
      return s && "name" in s
        ? {
            targetType: "scheme",
            targetId: s.slug,
            title: s.name,
            href: `/opportunities/schemes/${s.slug}`,
            meta: "Scheme",
          }
        : null;
    }
    case "grant": {
      const g = await one("grants");
      return g && "funder" in g
        ? {
            targetType: "grant",
            targetId: g.slug,
            title: g.title,
            href: `/opportunities/grants/${g.slug}`,
            meta: "Grant",
          }
        : null;
    }
    case "event": {
      const e = await one("events");
      return e && "startsAt" in e
        ? {
            targetType: "event",
            targetId: e.slug,
            title: e.name,
            href: `/events/${e.slug}`,
            meta: `Event · ${dayMonthYear(e.startsAt)}`,
          }
        : null;
    }
    case "job": {
      const j = await one("jobs");
      return j && "role" in j
        ? {
            targetType: "job",
            targetId: j.slug,
            title: j.role,
            href: `/opportunities/jobs/${j.slug}`,
            meta: `Job · ${j.company}`,
          }
        : null;
    }
    case "article": {
      const a = await one("articles");
      return a && "title" in a && "dek" in a
        ? {
            targetType: "article",
            targetId: a.slug,
            title: a.title,
            href: `/news/${a.slug}`,
            meta: `News · ${dayMonthYear(a.publishedAt ?? a.createdAt)}`,
          }
        : null;
    }
    case "product": {
      const d = await productDetail(getDb(), key, { includeSample: showSample() });
      return d
        ? {
            targetType: "product",
            targetId: d.slug,
            title: d.name,
            href: d.href,
            meta: `${d.classLabel} · ${d.category.label}`,
          }
        : null;
    }
    case "company": {
      const c = await companyProfile(getDb(), key, { includeSample: showSample() });
      return c
        ? {
            targetType: "company",
            targetId: c.slug,
            title: c.name,
            href: `/directory/companies/${c.slug}`,
            meta: c.types[0] ?? "Company",
          }
        : null;
    }
    default:
      return null;
  }
}
