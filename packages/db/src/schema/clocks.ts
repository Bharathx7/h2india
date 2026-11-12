import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

// Clocks (step 3.8). The database is the source of truth for every deadline; the queue is only the alarm clock.

/** Days that don't count as working days (M18): gazetted holidays, kept by a Super admin. Sundays are off anyway. */
export const holidays = core.table("holidays", {
  /** IST calendar date. */
  day: date("day", { mode: "string" }).primaryKey(),
  name: text("name").notNull(),
  /** For example "DoPT O.M. 12/2/2023-JCA, 16 Jul 2026". */
  source: text("source"),
  updatedBy: uuid("updated_by").references(() => users.id),
  ...timestamps,
});

/**
 * One deadline on one record: an order to accept in 48 hours, an RFQ to moderate in 1 working day. The engine emits
 * warn and expire once each (warned_at, expired_at are claimed atomically), even across restarts.
 */
export const deadlines = core.table(
  "deadlines",
  {
    id: id(),
    /** The clock, for example supplierAcceptsOrder. */
    type: text("type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    /** Open · Done · Cancelled */
    status: text("status").notNull().default("Open"),
    startedAt: utc("started_at").notNull(),
    warnAt: utc("warn_at"),
    dueAt: utc("due_at").notNull(),
    warnedAt: utc("warned_at"),
    expiredAt: utc("expired_at"),
    closedAt: utc("closed_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("deadlines_one_open")
      .on(t.type, t.subjectType, t.subjectId)
      .where(sql`${t.status} = 'Open'`),
    index("deadlines_due_idx")
      .on(t.dueAt)
      .where(sql`${t.status} = 'Open' AND ${t.expiredAt} IS NULL`),
    index("deadlines_warn_idx")
      .on(t.warnAt)
      .where(sql`${t.status} = 'Open' AND ${t.warnedAt} IS NULL`),
    index("deadlines_subject_idx").on(t.subjectType, t.subjectId),
  ],
);

/** Jobs that failed every retry, with the error, until someone retries or dismisses them. */
export const deadLetters = core.table(
  "dead_letters",
  {
    id: id(),
    queue: text("queue").notNull(),
    jobName: text("job_name").notNull(),
    jobId: text("job_id"),
    /** The job's data, masked like the audit log. */
    data: jsonb("data").$type<Record<string, unknown>>(),
    error: text("error").notNull(),
    stack: text("stack"),
    attempts: integer("attempts").notNull(),
    failedAt: utc("failed_at").notNull().defaultNow(),
    /** Retried · Dismissed */
    resolution: text("resolution"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: utc("resolved_at"),
  },
  (t) => [
    index("dead_letters_open_idx")
      .on(t.failedAt)
      .where(sql`${t.resolvedAt} IS NULL`),
  ],
);
