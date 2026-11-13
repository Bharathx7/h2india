import { sql } from "drizzle-orm";
import { text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
