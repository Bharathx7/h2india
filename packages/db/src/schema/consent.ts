import { boolean, index, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { core } from "./core";
import { users } from "./auth";

// Consent given or withdrawn inside a person's account (step 12.2): being listed in the members directory (M24) and
// marketing messages per topic and channel. Each row keeps the words shown and their version, so we can show what a
// person agreed to and when. Rows are only added, never changed; erasing an account removes them (data-rights.ts).
// Consents taken outside an account keep their own record: newsletter, cookies, gated reports, webinars, early listing.

export const consentRecords = core.table(
  "consent_records",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** member-directory, or marketing:<topic>:<channel>. */
    purpose: text("purpose").notNull(),
    granted: boolean("granted").notNull(),
    /** The words shown when the choice was made. */
    wording: text("wording").notNull(),
    version: text("version").notNull(),
    /** Where the choice was made: profile, preferences. */
    source: text("source").notNull(),
    at: utc("at").notNull().defaultNow(),
  },
  (t) => [index("consent_records_user").on(t.userId, t.purpose, t.at)],
);
