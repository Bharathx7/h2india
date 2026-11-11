import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgSchema, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";

// The application's own tables live in the "core" schema. The content system (Payload) gets the "cms"
// schema, created by the first migration (ADR 0002).
export const core = pgSchema("core");

/** One counter per reference type and year: ORD-2026-0001, RFQ-2026-0001 ... */
export const referenceSequences = core.table(
  "reference_sequences",
  {
    type: text("type").notNull(),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.type, t.year] })],
);

/** Every status change of every record, written by changeStatus() in the same transaction as the change. */
export const statusHistory = core.table(
  "status_history",
  {
    id: id(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("status_history_entity_idx").on(t.entityType, t.entityId, t.at)],
);

/**
 * Append-only audit log (step 3.6). Who did what to which record, when, from where and why.
 * The database refuses UPDATE and DELETE on this table (trigger in migration 0001).
 */
export const auditLog = core.table(
  "audit_log",
  {
    id: id(),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
    actorId: uuid("actor_id"),
    /** Set when an operator acts as another user (View as user). */
    actingAsId: uuid("acting_as_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    companyId: uuid("company_id"),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    reason: text("reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
  },
  (t) => [
    index("audit_log_resource_idx").on(t.resourceType, t.resourceId, t.at),
    index("audit_log_actor_idx").on(t.actorId, t.at),
    index("audit_log_company_idx").on(t.companyId, t.at),
  ],
);
