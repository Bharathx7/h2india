import { getDb } from "@h2india/core";
import { companyDocuments, type SearchDocument, type SearchIndexUid } from "@h2india/core/search";
import type { CollectionSlug, Payload, Where } from "payload";
import { STATE_OPTIONS } from "../cms/records/common";
import { publicWhere, showSample } from "../cms/sample";
import { dayMonthYear } from "../cms/tracker/format";
import { ARTICLE_TYPES } from "../cms/types";
import type {
  Article,
  Chapter,
  Event,
  Glossary,
  Grant,
  Guide,
  Job,
  Report,
  Scheme,
  Standard,
  Tender,
} from "../payload-types";
import { COLLECTION_INDEX, outboxId } from "./hooks";

// Search documents from CMS records (step 5.2). Each holds what a result row shows (title, the grey meta line, link,
// as drawn on 372:16695) and the fields its index searches. Only records readers may see are built: published and not
// sample (sample too where FLAG_SAMPLE_CONTENT is on). Nothing private, and no price: tender values and event ticket
// prices stay out of the index.

type KnowledgeSlug = "chapters" | "guides" | "glossary" | "standards" | "reports";

const names = (rel: unknown): string[] =>
  Array.isArray(rel)
    ? rel.flatMap((r) => (r && typeof r === "object" && "name" in r ? [(r as { name: string }).name] : []))
    : [];

const stateLabels = (values: string[] | null | undefined) =>
  (values ?? []).map((v) => STATE_OPTIONS.find((o) => o.value === v)?.label ?? v);

const line = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

const typeLabel = (type: string) => ARTICLE_TYPES.find((t) => t.value === type)?.label ?? type;

function article(a: Article): SearchDocument {
  return {
    id: String(a.id),
    title: a.title,
    meta: line(typeLabel(a.type), a.publishedAt ? dayMonthYear(a.publishedAt) : null),
    href: `/news/${a.slug}`,
    standfirst: a.dek,
    type: a.type,
    typeLabel: typeLabel(a.type),
    topics: names(a.topics),
    tags: names(a.tags),
    publishedAt: a.publishedAt ? Date.parse(a.publishedAt) : null,
  };
}

function scheme(s: Scheme): SearchDocument {
  const states = s.states ?? [];
  const central = states.length === 0 || states.includes("all-india");
  const by = [s.ministry, s.runBy].filter(Boolean).join(" / ");
  return {
    id: String(s.id),
    title: s.name,
    meta: line(central ? "Central" : stateLabels(states).join(", "), by, s.status),
    href: `/opportunities/schemes/${s.slug}`,
    name: s.name,
    runBy: s.runBy,
    ministry: s.ministry ?? "",
    summary: s.summary,
    purpose: s.purpose ?? "",
    level: central ? "central" : "state",
    states: stateLabels(states),
    whoCanApply: s.whoCanApply ?? [],
    topics: names(s.topics),
    nextDeadline: s.nextDeadline ? Date.parse(s.nextDeadline) : null,
  };
}

function tender(t: Tender): SearchDocument {
  return {
    id: String(t.id),
    title: t.title,
    meta: line(t.issuer, t.status, `Closes ${dayMonthYear(t.bidDueAt)}`),
    href: `/opportunities/tenders/${t.slug}`,
    issuer: t.issuer,
    tenderId: t.tenderId,
    category: t.category ?? "",
    description: t.description,
    states: stateLabels(t.states),
    topics: names(t.topics),
    closesAt: Date.parse(t.bidDueAt),
    publishedAt: Date.parse(t.createdAt),
  };
}

function grant(g: Grant): SearchDocument {
  return {
    id: String(g.id),
    title: g.title,
    meta: line(g.funder, g.status),
    href: `/opportunities/grants/${g.slug}`,
    funder: g.funder,
    themes: g.themes ?? [],
    whoCanApply: g.whoCanApply ?? [],
    howToApply: g.howToApply,
    states: stateLabels(g.states),
    closesAt: Date.parse(g.deadline),
  };
}

function job(j: Job): SearchDocument {
  return {
    id: String(j.id),
    title: j.role,
    meta: line(j.company, j.location, j.workMode),
    href: `/opportunities/jobs/${j.slug}`,
    role: j.role,
    company: j.company,
    function: j.function ?? "",
    location: j.location,
    workMode: j.workMode ?? null,
    experience: j.experience ?? null,
    skills: j.skills ?? [],
    description: j.description,
    closesAt: Date.parse(j.closesAt),
    publishedAt: Date.parse(j.postedAt ?? j.createdAt),
  };
}

function event(e: Event): SearchDocument {
  return {
    id: String(e.id),
    title: e.name,
    meta: line(e.format, dayMonthYear(e.startsAt), e.venue),
    href: `/events/${e.slug}`,
    name: e.name,
    organiser: e.organiser,
    venue: e.venue ?? "",
    format: e.format,
    summary: e.description ?? "",
    states: stateLabels(e.states),
    startsAt: Date.parse(e.startsAt),
  };
}

const KNOWLEDGE_KIND: Record<KnowledgeSlug, string> = {
  chapters: "Hydrogen 101",
  guides: "Buyer's guide",
  glossary: "Glossary",
  standards: "Standard",
  reports: "Report",
};

const KNOWLEDGE_PATH: Record<KnowledgeSlug, string> = {
  chapters: "/knowledge/hydrogen-101",
  guides: "/knowledge/insights",
  glossary: "/knowledge/glossary",
  standards: "/knowledge/standards",
  reports: "/knowledge/reports",
};

type KnowledgeDoc = Chapter | Guide | Glossary | Standard | Report;

function knowledge(collection: KnowledgeSlug, d: KnowledgeDoc): SearchDocument {
  const base = { id: outboxId(collection, d.id), kind: KNOWLEDGE_KIND[collection] };
  const href = (slug: string) => `${KNOWLEDGE_PATH[collection]}/${slug}`;
  if (collection === "glossary") {
    const g = d as Glossary;
    return {
      ...base,
      title: g.term,
      meta: line(base.kind, g.expansion),
      href: href(g.slug),
      aliases: g.aliases ?? [],
      summary: g.short,
    };
  }
  if (collection === "standards") {
    const s = d as Standard;
    return {
      ...base,
      title: `${s.code} · ${s.title}`,
      meta: line(base.kind, s.issuer),
      href: href(s.slug),
      aliases: [s.code],
      summary: s.summary,
    };
  }
  const t = d as Chapter | Guide | Report;
  return { ...base, title: t.title, meta: base.kind, href: href(t.slug), summary: t.summary };
}

function build(collection: string, doc: unknown): SearchDocument {
  switch (collection) {
    case "articles":
      return article(doc as Article);
    case "schemes":
      return scheme(doc as Scheme);
    case "tenders":
      return tender(doc as Tender);
    case "grants":
      return grant(doc as Grant);
    case "jobs":
      return job(doc as Job);
    case "events":
      return event(doc as Event);
    default:
      return knowledge(collection as KnowledgeSlug, doc as KnowledgeDoc);
  }
}

const collectionsOf = (uid: SearchIndexUid): CollectionSlug[] =>
  Object.entries(COLLECTION_INDEX)
    .filter(([, index]) => index === uid)
    .map(([c]) => c as CollectionSlug);

/** Every record readers may see in one collection, a page at a time. */
async function readable(payload: Payload, collection: CollectionSlug, ids?: (string | number)[]) {
  const where: Where = ids ? { and: [publicWhere(), { id: { in: ids } }] } : publicWhere();
  const out: unknown[] = [];
  for (let page = 1; ; page += 1) {
    const res = await payload.find({ collection, where, depth: 1, limit: 200, page, overrideAccess: true });
    out.push(...res.docs);
    if (!res.hasNextPage) return out;
  }
}

/** "glossary-18" → glossary, 18 for knowledge; any other index has one collection and plain ids. */
function splitOutboxId(uid: SearchIndexUid, id: string): { collection?: CollectionSlug; raw: string } {
  if (uid !== "knowledge") return { collection: collectionsOf(uid)[0], raw: id };
  const cut = id.lastIndexOf("-");
  return { collection: id.slice(0, cut) as CollectionSlug, raw: id.slice(cut + 1) };
}

/** The documents for these outbox record ids; an id with no readable record is left out (and removed from search). */
export async function loadDocuments(
  payload: Payload,
  uid: SearchIndexUid,
  recordIds: string[],
): Promise<Map<string, SearchDocument>> {
  const docs = new Map<string, SearchDocument>();
  if (uid === "companies") {
    for (const d of await companyDocuments(getDb(), { includeSample: showSample(), ids: recordIds })) docs.set(d.id, d);
    return docs;
  }
  if (uid === "products") return docs; // Stage 6
  const wanted = new Map<CollectionSlug, string[]>();
  for (const id of recordIds) {
    const { collection, raw } = splitOutboxId(uid, id);
    if (!collection || !raw || COLLECTION_INDEX[collection] !== uid) continue;
    wanted.set(collection, [...(wanted.get(collection) ?? []), raw]);
  }
  for (const [collection, ids] of wanted) {
    for (const doc of await readable(payload, collection, ids)) {
      const d = build(collection, doc);
      docs.set(d.id, d);
    }
  }
  return docs;
}

/** Every document one index should hold (pnpm search:reindex). */
export async function allDocuments(payload: Payload, uid: SearchIndexUid): Promise<SearchDocument[]> {
  if (uid === "companies") return companyDocuments(getDb(), { includeSample: showSample() });
  if (uid === "products") return [];
  const docs: SearchDocument[] = [];
  for (const collection of collectionsOf(uid)) {
    for (const doc of await readable(payload, collection)) docs.push(build(collection, doc));
  }
  return docs;
}
