import { sql } from "drizzle-orm";
import { boolean, index, integer, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { core } from "./core";
import { users } from "./auth";

/**
 * Webinar registrations (step 5.7; 732:521, 732:939, 827:14696). Personal data: only the fields the form shows, the
 * sponsor-consent words and their version, and whether the reminders have gone. One registration per webinar and
 * email. `kind` is "live" for a seat, or "replay" for the replay only (a full webinar, or after it ends); seats are
 * counted against the webinar's capacity on the CMS record.
 */
export const webinarRegistrations = core.table(
  "webinar_registrations",
  {
    id: id(),
    /** The webinar's id and slug in the CMS (events collection). */
    eventId: integer("event_id").notNull(),
    eventSlug: text("event_slug").notNull(),
    kind: text("kind").notNull().default("live"),
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    organisation: text("organisation"),
    role: text("role"),
    /** For the WhatsApp reminder only (optional). */
    mobile: text("mobile"),
    sponsorConsent: boolean("sponsor_consent").notNull().default(false),
    consentText: text("consent_text"),
    consentVersion: text("consent_version"),
    /** Set when each reminder is sent, so a retried job never sends it twice. */
    dayReminderAt: utc("day_reminder_at"),
    hourReminderAt: utc("hour_reminder_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    cancelledAt: utc("cancelled_at"),
  },
  (t) => [
    uniqueIndex("webinar_registrations_event_email").on(t.eventId, sql`lower(${t.email})`),
    index("webinar_registrations_event_kind").on(t.eventId, t.kind),
  ],
);
