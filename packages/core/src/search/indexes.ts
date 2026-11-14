// The public search indexes (step 5.2, ADR 0005). One Meilisearch index per content type, each with the fields people
// search, filter and sort on. Only what readers may see goes in: never drafts, private listings, RFQs or anything a
// company keeps private. Workspace search uses separate, scoped database queries.
//
// Design rule: no price on cards, search or filters. No index may hold a price field (see PRICE_FIELD).

export interface IndexDefinition {
  uid: SearchIndexUid;
  searchableAttributes: string[];
  filterableAttributes: string[];
  sortableAttributes: string[];
}

export const SEARCH_INDEX_UIDS = [
  "products",
  "companies",
  "articles",
  "schemes",
  "tenders",
  "grants",
  "jobs",
  "events",
  "knowledge",
] as const;
export type SearchIndexUid = (typeof SEARCH_INDEX_UIDS)[number];

export const isSearchIndex = (value: string): value is SearchIndexUid =>
  (SEARCH_INDEX_UIDS as readonly string[]).includes(value);

/** A field name that would carry a price. Product documents are checked against it before they are indexed. */
// Not "rate": "ratedPower" is a product attribute the filters use (63:804).
export const PRICE_FIELD = /price|mrp|cost|paise|rupee|^inr$|₹/i;

export const SEARCH_INDEXES: Record<SearchIndexUid, IndexDefinition> = {
  // Listings come with Stage 6; the index exists so the search box and the page are ready for them.
  products: {
    uid: "products",
    searchableAttributes: ["name", "brand", "model", "category", "supplierName", "summary"],
    filterableAttributes: ["class", "category", "applications", "attributes", "badges", "state", "madeInIndia"],
    sortableAttributes: ["publishedAt", "name"],
  },
  companies: {
    uid: "companies",
    searchableAttributes: ["name", "legalName", "categories", "types", "summary", "city", "state"],
    filterableAttributes: ["types", "state", "verified", "claimStatus"],
    sortableAttributes: ["name", "verified"],
  },
  articles: {
    uid: "articles",
    searchableAttributes: ["title", "standfirst", "topics", "tags", "typeLabel"],
    filterableAttributes: ["type", "topics", "tags"],
    sortableAttributes: ["publishedAt"],
  },
  schemes: {
    uid: "schemes",
    searchableAttributes: ["name", "runBy", "ministry", "summary", "purpose", "states"],
    filterableAttributes: ["level", "states", "whoCanApply", "topics"],
    sortableAttributes: ["nextDeadline", "name"],
  },
  tenders: {
    uid: "tenders",
    searchableAttributes: ["title", "issuer", "tenderId", "category", "description", "states"],
    filterableAttributes: ["states", "topics", "closesAt"],
    sortableAttributes: ["closesAt", "publishedAt"],
  },
  grants: {
    uid: "grants",
    searchableAttributes: ["title", "funder", "themes", "howToApply"],
    filterableAttributes: ["themes", "whoCanApply", "states"],
    sortableAttributes: ["closesAt"],
  },
  jobs: {
    uid: "jobs",
    searchableAttributes: ["role", "company", "function", "location", "skills", "description"],
    filterableAttributes: ["workMode", "experience", "location"],
    sortableAttributes: ["closesAt", "publishedAt"],
  },
  events: {
    uid: "events",
    searchableAttributes: ["name", "organiser", "venue", "format", "summary"],
    filterableAttributes: ["format", "states", "startsAt"],
    sortableAttributes: ["startsAt"],
  },
  // Hydrogen 101 chapters, buyer's guides, glossary terms, standards and reports, as one "Knowledge" scope.
  knowledge: {
    uid: "knowledge",
    searchableAttributes: ["title", "aliases", "summary", "kind"],
    filterableAttributes: ["kind"],
    sortableAttributes: ["title"],
  },
};

/**
 * Words people use for the same thing (playbook step 5.2: a starter list; the founder adds to it after trying twenty real
 * searches). Each group is mutual. Meilisearch matches every word of a group to the others.
 */
export const SYNONYM_GROUPS: string[][] = [
  ["h2", "hydrogen"],
  ["pem", "proton exchange membrane"],
];

export function synonymsSetting(groups: string[][] = SYNONYM_GROUPS): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const group of groups) {
    for (const word of group) out[word] = group.filter((w) => w !== word);
  }
  return out;
}

/** The scope chips in the header overlay (372:16695), in their order, and the indexes each one searches. */
export const SEARCH_SCOPES = [
  {
    id: "all",
    label: "All",
    indexes: ["products", "companies", "schemes", "articles", "tenders", "events", "knowledge"],
  },
  { id: "products", label: "Products", indexes: ["products"] },
  { id: "companies", label: "Companies", indexes: ["companies"] },
  { id: "news", label: "News", indexes: ["articles"] },
  { id: "schemes", label: "Schemes", indexes: ["schemes"] },
  { id: "tenders", label: "Tenders", indexes: ["tenders"] },
  { id: "events", label: "Events", indexes: ["events"] },
  { id: "knowledge", label: "Knowledge", indexes: ["knowledge"] },
] as const satisfies readonly { id: string; label: string; indexes: readonly SearchIndexUid[] }[];

export type SearchScope = (typeof SEARCH_SCOPES)[number]["id"];

export const isSearchScope = (value: string): value is SearchScope => SEARCH_SCOPES.some((s) => s.id === value);
