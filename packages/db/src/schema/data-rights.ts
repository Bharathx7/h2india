import { sql } from "drizzle-orm";
import { index, jsonb, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

/**
 * Data-rights requests (660:1786, step 11.7): a person asks for their data (access), a correction, or erasure. DRR
 * reference, due 30 days after receipt (clock dataRightsDue). Erasure runs as a reviewed job: a dry run first, listing
 * every table and file affected, then the erasure, which masks what the law requires us to keep.
 */
export const dataRightsRequests = core.table(
  "data_rights_requests",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    /** access · correct · erase */
    kind: text("kind").notNull(),
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => users.id),
    details: text("details"),
    /** Received · In progress · Completed · Rejected */
    status: text("status").notNull().default("Received"),
    dueAt: utc("due_at").notNull(),
    /** The last dry run (erasure) and who reviewed it. */
    plan: jsonb("plan"),
    planBy: uuid("plan_by").references(() => users.id),
    resolution: text("resolution"),
    completedAt: utc("completed_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("data_rights_status").on(t.status, t.dueAt)],
);
