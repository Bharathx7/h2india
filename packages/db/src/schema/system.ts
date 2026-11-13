import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

/**
 * Setting changes that need a second operator (System settings 707:793, step 11.8): one operator proposes, another
 * approves or declines. Applied through setSetting, so the audit log has both people.
 */
export const settingProposals = core.table(
  "setting_proposals",
  {
    id: id(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    reason: text("reason"),
    proposedBy: uuid("proposed_by")
      .notNull()
      .references(() => users.id),
    proposedAt: utc("proposed_at")
      .notNull()
      .default(sql`now()`),
    /** Approved · Declined */
    decision: text("decision"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
  },
  (t) => [index("setting_proposals_open").on(t.decidedAt)],
);

/**
 * Reports (716:348): figures rolled up nightly by IST day, so reports never run on live tables. One row per metric a
 * day.
 */
export const reportDaily = core.table(
  "report_daily",
  {
    day: date("day").notNull(),
    metric: text("metric").notNull(),
    value: integer("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.metric] })],
);

/** Schedule report email (267:7338): who gets which report, how often. */
export const reportSchedules = core.table("report_schedules", {
  id: id(),
  email: text("email").notNull(),
  /** weekly (Monday 09:00 IST) · monthly (1st, 09:00 IST) */
  frequency: text("frequency").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  lastSentAt: utc("last_sent_at"),
  createdAt: utc("created_at")
    .notNull()
    .default(sql`now()`),
});
