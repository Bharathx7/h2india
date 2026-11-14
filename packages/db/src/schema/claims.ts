import { sql } from "drizzle-orm";
import { index, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";

/**
 * Claim this profile (step 6.7; 492:5615 to 494:427). A person proves they represent a pre-seeded company: by a code
 * sent to an email on the company's own domain, or by GSTIN and an authorisation letter. Every claim is approved by an
 * operator (A137); approval makes the claimant an Admin of the company and the profile Claimed, audit-logged.
 * Statuses change only through changeStatus(): Pending → Approved | Rejected.
 */
export const companyClaims = core.table(
  "company_claims",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    claimantId: uuid("claimant_id")
      .notNull()
      .references(() => users.id),
    /** email or gstin */
    method: text("method").notNull(),
    email: text("email"),
    emailVerifiedAt: utc("email_verified_at"),
    gstin: text("gstin"),
    /** The authorisation letter in the files service. */
    letterFileId: text("letter_file_id"),
    /** Started (code sent, not yet entered), Pending, Approved, Rejected */
    status: text("status").notNull().default("Started"),
    reason: text("reason"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("company_claims_org").on(t.organisationId, t.status),
    index("company_claims_claimant").on(t.claimantId),
  ],
);
