import { sql } from "drizzle-orm";
import { index, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";

// The supplier workspace (Stage 8).

/**
 * "Submit for review" (584:8 step 5): the supplier asks H2 India to check the company and first listing. Operators
 * decide it in the Verification desk (step 8.2). Statuses change only through changeStatus().
 */
export const supplierReviews = core.table(
  "supplier_reviews",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** Submitted, Approved, Changes requested */
    status: text("status").notNull().default("Submitted"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    submittedAt: utc("submitted_at")
      .notNull()
      .default(sql`now()`),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    reason: text("reason"),
    updatedAt: utc("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("supplier_reviews_org").on(t.organisationId, t.submittedAt)],
);
