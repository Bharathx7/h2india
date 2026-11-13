import { sql } from "drizzle-orm";
import { integer, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";
import { newsletterSubscribers } from "./newsletter";

/**
 * Sending India H₂ Weekly (step 11.3; Issues 647:8, Composer 648:312). An issue is written in the CMS; its send lives
 * here: subject, preview, when (IST), and how far it got. Each subscriber gets it at most once (newsletter_deliveries).
 * Opens and clicks are recorded only as the email provider reports them.
 */
export const newsletterSends = core.table("newsletter_sends", {
  id: id(),
  /** The CMS newsletter-issues id. */
  issueId: text("issue_id").notNull().unique(),
  subject: text("subject").notNull().default(""),
  preview: text("preview").notNull().default(""),
  editorNote: text("editor_note").notNull().default(""),
  /** all (confirmed subscribers) */
  segment: text("segment").notNull().default("all"),
  /** Draft · Scheduled · Due · Sending · Sent */
  status: text("status").notNull().default("Draft"),
  sendAt: utc("send_at"),
  sentAt: utc("sent_at"),
  delivered: integer("delivered").notNull().default(0),
  opens: integer("opens"),
  clicks: integer("clicks"),
  lastTestAt: utc("last_test_at"),
  updatedBy: uuid("updated_by").references(() => users.id),
  ...timestamps,
});

export const newsletterDeliveries = core.table(
  "newsletter_deliveries",
  {
    sendId: uuid("send_id")
      .notNull()
      .references(() => newsletterSends.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => newsletterSubscribers.id),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.sendId, t.subscriberId] })],
);
