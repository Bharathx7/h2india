import { boolean, index, text, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { core } from "./core";

// India H₂ Weekly subscribers (step 5.1, A46; brought forward from 5.9). Double opt-in: a sign-up is "pending" until the
// emailed link is opened, and only "confirmed" addresses get issues (step 11.3). The consent text version shown at
// sign-up is kept with the record (playbook step 5.9).

export const newsletterSubscribers = core.table(
  "newsletter_subscribers",
  {
    id: id(),
    /** Lower-cased work email; one record per address. */
    email: text("email").notNull(),
    /** pending · confirmed · unsubscribed */
    status: text("status").notNull().default("pending"),
    /** Topic keys from NEWSLETTER_TOPICS. */
    topics: text("topics").array().notNull().default([]),
    /** "Also send me" (448:7157). */
    tenderDigest: boolean("tender_digest").notNull().default(false),
    monthlyNote: boolean("monthly_note").notNull().default(false),
    /** Where the sign-up came from: footer, coming-soon, newsletter page. */
    source: text("source").notNull(),
    consentVersion: text("consent_version").notNull(),
    /** Bumped on every link we send, so only the latest link works. */
    linkNonce: text("link_nonce").notNull(),
    confirmedAt: utc("confirmed_at"),
    unsubscribedAt: utc("unsubscribed_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("newsletter_subscribers_email_unique").on(t.email),
    index("newsletter_subscribers_status_idx").on(t.status),
  ],
);

/**
 * Cookie consent records (step 5.9, banner 53:1455): one row per choice, so we can show what a browser agreed to and
 * when. No personal data: a random browser id, the consent version and the optional categories chosen (M10 decides
 * categories beyond Necessary; Analytics is the only one today).
 */
export const cookieConsents = core.table(
  "cookie_consents",
  {
    id: id(),
    browserId: text("browser_id").notNull(),
    version: text("version").notNull(),
    analytics: boolean("analytics").notNull(),
    /** banner · preferences */
    source: text("source").notNull(),
    createdAt: utc("created_at").notNull().defaultNow(),
  },
  (t) => [index("cookie_consents_browser_idx").on(t.browserId, t.createdAt)],
);
