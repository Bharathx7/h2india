import { bigserial, index, integer, text } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { core } from "./core";
import { sql } from "drizzle-orm";

// Search (step 5.2, ADR 0005). The Meilisearch indexes are a copy; the database is the truth.

/**
 * Index changes waiting for the worker. A row is written in the same transaction as the record change (publish, update,
 * unpublish, delete), so a change can never reach the database without also reaching the queue. The worker reads the
 * record again when it processes the row: if readers may see it, it is written to the index, otherwise removed.
 */
export const searchOutbox = core.table(
  "search_outbox",
  {
    /** Ordered, so changes to one record are applied in the order they happened. */
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    /** Index uid from SEARCH_INDEXES, for example articles. */
    indexUid: text("index_uid").notNull(),
    /** The record's id in its own table (a Payload id or an organisation UUID). */
    recordId: text("record_id").notNull(),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    /** Set when the index has the change; null while waiting. */
    processedAt: utc("processed_at"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (t) => [
    index("search_outbox_waiting_idx")
      .on(t.seq)
      .where(sql`${t.processedAt} IS NULL`),
  ],
);

/**
 * Searches that found nothing (playbook step 5.2), for the admin Search management screen (707:281, step 11.3). Only
 * the words, the scope and the time are kept: never who searched.
 */
export const searchMisses = core.table(
  "search_misses",
  {
    id: id(),
    /** Lower-cased, trimmed, at most 200 characters. */
    query: text("query").notNull(),
    /** all, products, companies, news, schemes, tenders, events, knowledge, suppliers */
    scope: text("scope").notNull(),
    /** header (the overlay) or page (/search) */
    source: text("source").notNull(),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("search_misses_created_idx").on(t.createdAt), index("search_misses_query_idx").on(t.query)],
);
