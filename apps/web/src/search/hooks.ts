import { indexChangeSql, nudgeIndexer, type SearchIndexUid } from "@h2india/core/search";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";

// Search outbox hooks for CMS collections (step 5.2). Every save or delete writes an outbox row inside the CMS's own
// transaction, so the change and its row commit or roll back together; the worker then reads the record again and
// updates or removes it in the index. Drafts are never indexed: the reader rule (published, non-sample) decides there.

/** Which index each CMS collection feeds, and the outbox record id (knowledge mixes five collections, so it prefixes:
 * glossary-18; Meilisearch ids allow only letters, digits, - and _). */
export const COLLECTION_INDEX: Record<string, SearchIndexUid> = {
  articles: "articles",
  schemes: "schemes",
  tenders: "tenders",
  grants: "grants",
  jobs: "jobs",
  events: "events",
  chapters: "knowledge",
  guides: "knowledge",
  glossary: "knowledge",
  standards: "knowledge",
  reports: "knowledge",
};

export function outboxId(collection: string, id: string | number): string {
  return COLLECTION_INDEX[collection] === "knowledge" ? `${collection}-${String(id)}` : String(id);
}

interface PayloadDrizzle {
  execute: (query: unknown) => Promise<unknown>;
}

/** The CMS's database handle for this request: its open transaction when there is one. */
async function cmsTransaction(req: PayloadRequest): Promise<PayloadDrizzle> {
  const adapter = req.payload.db as unknown as {
    drizzle: PayloadDrizzle;
    sessions?: Record<string, { db: PayloadDrizzle }>;
  };
  const txId = req.transactionID ? await req.transactionID : undefined;
  return (txId !== undefined && adapter.sessions?.[String(txId)]?.db) || adapter.drizzle;
}

async function queue(req: PayloadRequest, collection: string, id: string | number) {
  const uid = COLLECTION_INDEX[collection];
  if (!uid) return;
  const db = await cmsTransaction(req);
  await db.execute(indexChangeSql(uid, [outboxId(collection, id)]));
  // After the response: a slow or missing Redis never holds up the editor, and the minute sweep catches up.
  void nudgeIndexer().catch(() => undefined);
}

export const queueSearchOnChange: CollectionAfterChangeHook = async ({ doc, collection, req }) => {
  const saved = doc as { id: string | number };
  await queue(req, collection.slug, saved.id);
  return saved;
};

export const queueSearchOnDelete: CollectionAfterDeleteHook = async ({ id, collection, req }) => {
  await queue(req, collection.slug, id);
};

export const searchHooks = { afterChange: [queueSearchOnChange], afterDelete: [queueSearchOnDelete] };
