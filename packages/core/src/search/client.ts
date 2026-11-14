import { parseServerEnv } from "@h2india/config";
import { Meilisearch } from "meilisearch";
import type { SearchDocument } from "./documents";
import { SEARCH_INDEXES, SEARCH_INDEX_UIDS, synonymsSetting, type SearchIndexUid } from "./indexes";

// The one module that talks to the search engine (ADR 0005: swapping engines means rewriting this file and re-indexing).
// The master key stays on the server; browsers only ever reach search through our own routes.

let client: Meilisearch | undefined;

export function searchClient(): Meilisearch {
  if (!client) {
    const env = parseServerEnv();
    client = new Meilisearch({ host: env.MEILI_HOST, apiKey: env.MEILI_MASTER_KEY, timeout: 5000 });
  }
  return client;
}

/** Index uids get a prefix so tests can use their own copies of the same indexes on the same engine. */
export function indexName(uid: SearchIndexUid, prefix = process.env.SEARCH_INDEX_PREFIX ?? ""): string {
  return `${prefix}${uid}`;
}

/** The settings every index carries: its fields, the synonyms, typo tolerance (on, Meilisearch's defaults). */
function settingsFor(uid: SearchIndexUid, groups?: string[][]) {
  const def = SEARCH_INDEXES[uid];
  return {
    searchableAttributes: def.searchableAttributes,
    // id too, so alerts can ask whether a just-changed record matches a saved search (step 7.3).
    filterableAttributes: [...def.filterableAttributes, "id"],
    sortableAttributes: def.sortableAttributes,
    synonyms: synonymsSetting(groups),
    typoTolerance: { enabled: true },
  };
}

/** Creates any missing index and applies the settings. Safe to run again; the engine skips unchanged settings. */
export async function ensureIndexes(uids: readonly SearchIndexUid[] = SEARCH_INDEX_UIDS): Promise<void> {
  const ms = searchClient();
  // Synonyms edited in Search management (step 11.3) are kept; a deploy doesn't reset them to the code's list.
  const { currentSynonyms } = await import("./manage");
  const groups = await currentSynonyms();
  for (const uid of uids) {
    const name = indexName(uid);
    await ms.createIndex(name, { primaryKey: "id" }).waitTask();
    await ms.index(name).updateSettings(settingsFor(uid, groups)).waitTask();
  }
}

/** Writes documents to an index and removes ids. Waits until the engine has applied both. */
export async function applyToIndex(uid: SearchIndexUid, upserts: SearchDocument[], deletes: string[]): Promise<void> {
  const index = searchClient().index<SearchDocument>(indexName(uid));
  if (upserts.length) {
    const task = await index.addDocuments(upserts, { primaryKey: "id" }).waitTask();
    if (task.status === "failed") throw new Error(`${uid}: ${task.error?.message ?? "indexing failed"}`);
  }
  if (deletes.length) {
    const task = await index.deleteDocuments(deletes).waitTask();
    if (task.status === "failed") throw new Error(`${uid}: ${task.error?.message ?? "delete failed"}`);
  }
}

/**
 * Rebuilds one index from a full list of documents with no gap for readers: the new copy is filled beside the live one,
 * then the two are swapped and the old one deleted.
 */
export async function replaceIndex(uid: SearchIndexUid, documents: SearchDocument[]): Promise<void> {
  const ms = searchClient();
  const live = indexName(uid);
  const fresh = `${live}__rebuild`;
  await ensureIndexes([uid]);
  await ms.deleteIndexIfExists(fresh);
  await ms.createIndex(fresh, { primaryKey: "id" }).waitTask();
  await ms.index(fresh).updateSettings(settingsFor(uid)).waitTask();
  if (documents.length) {
    const task = await ms.index(fresh).addDocuments(documents, { primaryKey: "id" }).waitTask();
    if (task.status === "failed") throw new Error(`${uid}: ${task.error?.message ?? "indexing failed"}`);
  }
  await ms.swapIndexes([{ indexes: [live, fresh], rename: false }]).waitTask();
  await ms.deleteIndexIfExists(fresh);
}
