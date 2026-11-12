import { MeilisearchApiError } from "meilisearch";
import { ensureIndexes, indexName, searchClient } from "./client";
import type { SearchDocument } from "./documents";
import { SEARCH_SCOPES, type SearchIndexUid, type SearchScope } from "./indexes";

// Reading the indexes (step 5.2): grouped suggestions for the header overlay (372:16695) and one index a page at a time
// for /search (63:795). Only the fields a result shows are returned.

export interface SearchHit {
  id: string;
  title: string;
  meta: string;
  href: string;
  [field: string]: unknown;
}

export interface SuggestionGroup {
  index: SearchIndexUid;
  hits: SearchHit[];
  total: number;
}

export interface Suggestions {
  query: string;
  scope: SearchScope;
  groups: SuggestionGroup[];
  /** All matches across the scope's indexes ("See all 248 results"). */
  total: number;
}

const SHOWN = ["id", "title", "meta", "href"];
/**
 * Every word must match (each one typo-tolerant). Meilisearch's default drops words from the end until something
 * matches, so "hydrogen flare stak 5 MW" would list everything about hydrogen instead of the drawn no-results state
 * (372:16870).
 */
const MATCHING = "all" as const;
/** Longer queries are cut: nobody types 200 characters, and it keeps the engine's work bounded. */
export const MAX_QUERY = 200;

/**
 * Runs a read; if an index doesn't exist yet (a fresh engine, before the worker's first sync), creates the indexes once
 * and tries again, so the first visitor sees "no results" rather than an error.
 */
async function withIndexes<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!(error instanceof MeilisearchApiError) || error.cause?.code !== "index_not_found") throw error;
    await ensureIndexes();
    return read();
  }
}

export function cleanQuery(q: string | null | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
}

/** How many rows a group shows in the overlay: the drawn "All" shows two products and one of everything else. */
function groupLimit(scope: SearchScope, index: SearchIndexUid): number {
  if (scope !== "all") return 8;
  return index === "products" ? 2 : 1;
}

export async function suggest(query: string, scope: SearchScope): Promise<Suggestions> {
  const q = cleanQuery(query);
  const indexes = SEARCH_SCOPES.find((s) => s.id === scope)?.indexes ?? [];
  if (!q) return { query: q, scope, groups: [], total: 0 };
  const { results } = await withIndexes(() =>
    searchClient().multiSearch({
      queries: indexes.map((uid) => ({
        indexUid: indexName(uid),
        q,
        matchingStrategy: MATCHING,
        limit: groupLimit(scope, uid),
        attributesToRetrieve: SHOWN,
      })),
    }),
  );
  const groups = results.map((r, i) => ({
    index: indexes[i] as SearchIndexUid,
    hits: r.hits as SearchHit[],
    total: r.estimatedTotalHits ?? r.hits.length,
  }));
  return {
    query: q,
    scope,
    groups: groups.filter((g) => g.hits.length > 0),
    total: groups.reduce((n, g) => n + g.total, 0),
  };
}

export interface SearchPage<T extends SearchHit = SearchHit> {
  hits: T[];
  total: number;
  page: number;
  totalPages: number;
}

/** One page of one index, with an exact total (the page title says "64 products and 18 suppliers match"). */
export async function searchIndex<T extends SearchHit = SearchHit>(
  uid: SearchIndexUid,
  query: string,
  opts: { page?: number; perPage?: number; fields?: string[] } = {},
): Promise<SearchPage<T>> {
  const q = cleanQuery(query);
  const res = await withIndexes(() =>
    searchClient()
      .index<SearchDocument>(indexName(uid))
      .search(q, {
        matchingStrategy: MATCHING,
        page: Math.max(1, opts.page ?? 1),
        hitsPerPage: opts.perPage ?? 6,
        attributesToRetrieve: opts.fields ?? ["*"],
      }),
  );
  return {
    hits: res.hits as unknown as T[],
    total: res.totalHits,
    page: res.page,
    totalPages: res.totalPages,
  };
}

/** Matches per index, for the counts on the /search tabs. */
export async function countMatches(query: string, uids: SearchIndexUid[]): Promise<Record<string, number>> {
  const q = cleanQuery(query);
  const { results } = await withIndexes(() =>
    searchClient().multiSearch({
      queries: uids.map((uid) => ({ indexUid: indexName(uid), q, matchingStrategy: MATCHING, limit: 0 })),
    }),
  );
  return Object.fromEntries(uids.map((uid, i) => [uid, results[i]?.estimatedTotalHits ?? 0]));
}
