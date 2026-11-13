import { schema, type Executor } from "@h2india/db";
import { and, asc, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";
import { enqueue, QUEUES } from "../queue/queues";
import { applyToIndex } from "./client";
import type { SearchDocument } from "./documents";
import { isSearchIndex, type SearchIndexUid } from "./indexes";

// The search outbox (step 5.2). A change is written here in the same transaction as the record change; the worker
// applies it to the index. The row only says "this record changed": the worker reads the record again, so the index
// always ends up matching what readers may see now, however many changes queued up.

const { searchOutbox: o } = schema;

/** Queues index changes inside the caller's transaction. */
export async function queueIndexChange(
  ex: Executor,
  indexUid: SearchIndexUid,
  recordIds: (string | number)[],
  opts: { alerts?: boolean } = {},
) {
  if (!recordIds.length) return;
  // A refresh (statuses that follow the date) changes nothing a person did, so alerts skip it (step 7.3).
  const alertsAt = opts.alerts === false ? new Date() : null;
  await ex.insert(o).values(recordIds.map((id) => ({ indexUid, recordId: String(id), alertsAt })));
}

/**
 * The same insert as plain SQL, for a transaction this package doesn't own (the CMS runs its own drizzle). Executed with
 * that transaction's `execute()`, so the change and its queue row commit or roll back together.
 */
export function indexChangeSql(indexUid: SearchIndexUid, recordIds: (string | number)[]): SQL {
  const rows = recordIds.map((id) => sql`(${indexUid}, ${String(id)})`);
  return sql`insert into core.search_outbox (index_uid, record_id) values ${sql.join(rows, sql`, `)}`;
}

/**
 * Asks the worker to apply waiting changes soon. A few seconds' delay lets the record's transaction commit first; one
 * job id per window, so a burst of saves makes one job. The every-minute sweep catches anything this misses.
 */
export async function nudgeIndexer(): Promise<void> {
  const window = Math.floor(Date.now() / 5000);
  await enqueue(QUEUES.index, "search-sync", {}, { delay: 3000, jobId: `search-sync-${String(window)}` });
}

/** Finds the documents readers may see for these record ids; a record missing from the map is removed from search. */
export type DocumentLoader = (indexUid: SearchIndexUid, recordIds: string[]) => Promise<Map<string, SearchDocument>>;

export interface SyncReport {
  applied: number;
  failed: number;
}

const BATCH = 200;
const MAX_ATTEMPTS = 10;

/**
 * Applies waiting outbox rows to the indexes. Rows are claimed with SKIP LOCKED so two runs never apply the same rows;
 * a failed index keeps its rows for the next run (with the error) until MAX_ATTEMPTS, when they stay for an operator.
 */
export async function syncSearch(db: Executor, load: DocumentLoader): Promise<SyncReport> {
  const report: SyncReport = { applied: 0, failed: 0 };
  for (;;) {
    const done = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ seq: o.seq, indexUid: o.indexUid, recordId: o.recordId })
        .from(o)
        .where(and(isNull(o.processedAt), lt(o.attempts, MAX_ATTEMPTS)))
        .orderBy(asc(o.seq))
        .limit(BATCH)
        .for("update", { skipLocked: true });
      if (!rows.length) return true;

      let failedHere = false;
      const byIndex = new Map<string, typeof rows>();
      for (const r of rows) byIndex.set(r.indexUid, [...(byIndex.get(r.indexUid) ?? []), r]);

      for (const [uid, group] of byIndex) {
        const seqs = group.map((r) => r.seq);
        try {
          if (!isSearchIndex(uid)) throw new Error(`Unknown search index ${uid}`);
          const ids = [...new Set(group.map((r) => r.recordId))];
          const docs = await load(uid, ids);
          await applyToIndex(
            uid,
            ids.flatMap((id) => {
              const d = docs.get(id);
              return d ? [d] : [];
            }),
            ids.filter((id) => !docs.has(id)),
          );
          await tx.update(o).set({ processedAt: new Date(), lastError: null }).where(inArray(o.seq, seqs));
          report.applied += group.length;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`search-sync ${uid}: ${message}`);
          await tx
            .update(o)
            .set({ attempts: sql`${o.attempts} + 1`, lastError: message.slice(0, 500) })
            .where(inArray(o.seq, seqs));
          report.failed += group.length;
          failedHere = true;
        }
      }
      // After a failure, stop: the next run (seconds or a minute away) tries again, instead of spinning on it now.
      return failedHere || rows.length < BATCH;
    });
    if (done) return report;
  }
}

/** Applied rows are kept a week for checking, then removed by housekeeping. */
export async function pruneSearchOutbox(db: Executor): Promise<void> {
  await db.delete(o).where(sql`${o.processedAt} < now() - interval '7 days' and ${o.alertsAt} is not null`);
}
