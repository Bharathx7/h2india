import { index, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";

// Account recovery (step 3.5, Figma 528:8). One row per attempt. Each path needs two independent proofs; the row
// records which were given, and whether an Admin or H2 India support must still approve.

export const recoveryRequests = core.table(
  "recovery_requests",
  {
    id: id(),
    /** passkey | mobile | email | support */
    kind: text("kind").notNull(),
    /** Started · Waiting for admin · Waiting for support · Approved · Declined · Completed · Expired */
    status: text("status").notNull().default("Started"),
    /** Hash of the random token in the person's recovery cookie. */
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    emailVerifiedAt: utc("email_verified_at"),
    mobileVerifiedAt: utc("mobile_verified_at"),
    /** Changed mobile: the new number, proved by its own SMS code. */
    newMobile: text("new_mobile"),
    newMobileVerifiedAt: utc("new_mobile_verified_at"),
    /** Lost email: the new work email, proved by a link. */
    newEmail: text("new_email"),
    /** Support request (528:534). */
    reference: text("reference").unique(),
    contactName: text("contact_name"),
    contactCompany: text("contact_company"),
    contactEmail: text("contact_email"),
    documentFileId: uuid("document_file_id"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    expiresAt: utc("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [index("recovery_requests_user_idx").on(t.userId), index("recovery_requests_org_idx").on(t.organisationId)],
);
