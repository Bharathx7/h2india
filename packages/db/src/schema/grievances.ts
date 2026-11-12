import { sql } from "drizzle-orm";
import { index, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { core } from "./core";
import { users } from "./auth";

/**
 * Grievances (step 5.8; Grievance officer 519:8, ticket 519:538, status 519:588). Personal data: only what the form
 * shows. Each complaint has a GRV reference and two deadlines (acknowledge in 24 hours, resolve in 15 days, A24).
 * Statuses change only through changeStatus(): Received → Acknowledged → In review → Resolved.
 */
export const grievances = core.table(
  "grievances",
  {
    id: id(),
    reference: text("reference").notNull(),
    /** Content, Listing, Privacy, Payment or Other. */
    type: text("type").notNull(),
    pageUrl: text("page_url"),
    description: text("description").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile"),
    /** File ids of the attachments (screenshots, documents), opened only through the files service. */
    files: text("files")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    userId: uuid("user_id").references(() => users.id),
    status: text("status").notNull().default("Received"),
    /** Who is handling it, shown on the status page ("assigned to the listings team"). */
    team: text("team"),
    /** One line the complainant may see on the status page ("We've asked the supplier for documents"). */
    publicNote: text("public_note"),
    outcome: text("outcome"),
    resolveBy: utc("resolve_by").notNull(),
    acknowledgedAt: utc("acknowledged_at"),
    resolvedAt: utc("resolved_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("grievances_reference").on(t.reference),
    index("grievances_status").on(t.status, t.createdAt),
    index("grievances_email").on(sql`lower(${t.email})`),
  ],
);
