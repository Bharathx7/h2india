import { schema, type Database, type Executor } from "@h2india/db";
import { desc, gt, sql } from "drizzle-orm";
import { z } from "zod";
import type { RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { getDb } from "../db";
import { defineSetting, getSetting, setSetting } from "../settings";
import { indexName, searchClient } from "./client";
import { SEARCH_INDEX_UIDS, SYNONYM_GROUPS, synonymsSetting, type SearchIndexUid } from "./indexes";

// Search management (707:281), step 11.3: what people searched for and found nothing, the synonyms that close those
// gaps, and boosted results (a record shown first for a search). Synonyms and boosts are settings: saving them changes
// the live indexes at once, with no deploy, and every change is audited (setSetting).

export const SEARCH_SYNONYMS = defineSetting<string[][]>({
  key: "search.synonyms",
  description: "Search synonyms: each group's words match each other",
  schema: z.array(z.array(z.string().min(1).max(60)).min(2).max(10)).max(500),
  fallback: SYNONYM_GROUPS,
});

export interface Boost {
  query: string;
  index: SearchIndexUid;
  documentId: string;
  label: string;
}

export const SEARCH_BOOSTS = defineSetting<Boost[]>({
  key: "search.boosts",
  description: "Boosted results: a record shown first for a search",
  schema: z
    .array(
      z.object({
        query: z.string().min(1).max(100),
        index: z.enum(SEARCH_INDEX_UIDS),
        documentId: z.string().min(1).max(200),
        label: z.string().max(200),
      }),
    )
    .max(200),
  fallback: [],
});

const clean = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

/** Stored synonyms, or the code's list if the database can't be read (index set-up on a fresh machine). */
export async function currentSynonyms(ex?: Executor): Promise<string[][]> {
  try {
    return await getSetting(ex ?? getDb(), SEARCH_SYNONYMS);
  } catch {
    return SYNONYM_GROUPS;
  }
}

/** Pushes synonyms to every index. */
export async function applySynonyms(groups: string[][]) {
  const ms = searchClient();
  for (const uid of SEARCH_INDEX_UIDS)
    await ms.index(indexName(uid)).updateSynonyms(synonymsSetting(groups)).waitTask();
}

export async function saveSynonyms(db: Database, actor: Actor, groups: string[][], context?: RequestContext) {
  const tidy = groups.map((g) => [...new Set(g.map(clean).filter(Boolean))]).filter((g) => g.length >= 2);
  await setSetting(db, actor, SEARCH_SYNONYMS, tidy, { context });
  await applySynonyms(tidy);
}

export async function saveBoosts(db: Database, actor: Actor, boosts: Boost[], context?: RequestContext) {
  await setSetting(
    db,
    actor,
    SEARCH_BOOSTS,
    boosts.map((b) => ({ ...b, query: clean(b.query) })),
    { context },
  );
}

/** Boosts for this search in this index (applied on the first page of /search). */
export async function boostsFor(query: string, uid: SearchIndexUid): Promise<Boost[]> {
  try {
    const q = clean(query);
    return (await getSetting(getDb(), SEARCH_BOOSTS)).filter((b) => b.index === uid && b.query === q);
  } catch {
    return [];
  }
}

/** Searches that found nothing in the last `days` days, most frequent first (707:281). Operators with settings.view. */
export async function searchMissReport(db: Executor, actor: Actor, days = 30, now = new Date()) {
  assertCan(actor, "settings.view");
  const m = schema.searchMisses;
  const since = new Date(now.getTime() - days * 86_400_000);
  return db
    .select({ query: m.query, searches: sql<number>`count(*)::int`, last: sql<Date>`max(${m.createdAt})` })
    .from(m)
    .where(gt(m.createdAt, since))
    .groupBy(m.query)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${m.createdAt})`))
    .limit(200);
}
