import { sql } from "drizzle-orm";
import { index, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

/**
 * Who has an item in a moderation queue, and the decision (step 11.2). One row per (queue, item): an operator claims
 * it, and only the claimant can decide it, once. Items live in their own tables (or the CMS); this only holds the claim.
 */
export const queueClaims = core.table(
  "queue_claims",
  {
    id: id(),
    /** suppliers · listings · rfqs · content · events · jobs · comments */
    queue: text("queue").notNull(),
    subjectId: text("subject_id").notNull(),
    claimedBy: uuid("claimed_by").references(() => users.id),
    claimedAt: utc("claimed_at"),
    /** approve · changes · reject */
    decision: text("decision"),
    reasons: text("reasons")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
  },
  (t) => [uniqueIndex("queue_claims_item").on(t.queue, t.subjectId)],
);

/**
 * A moderator's comment on one field of a queued item (633:8): internal, for the next moderator, never sent to the
 * submitter. Append-only.
 */
export const queueFieldComments = core.table(
  "queue_field_comments",
  {
    id: id(),
    queue: text("queue").notNull(),
    subjectId: text("subject_id").notNull(),
    /** The field's label as shown on the moderation screen, for example "Body". */
    field: text("field").notNull(),
    note: text("note").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("queue_field_comments_item").on(t.queue, t.subjectId)],
);

/** An operator's saved view of a queue (Save view): a name and the filters (view and search). */
export const queueSavedViews = core.table(
  "queue_saved_views",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    queue: text("queue").notNull(),
    name: text("name").notNull(),
    view: text("view").notNull().default("all"),
    search: text("search").notNull().default(""),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("queue_saved_views_name").on(t.userId, t.queue, t.name)],
);
