import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

// Notifications (step 3.9): one service sends every message and records what was sent.

/** In-app notifications for the bell (97:3168) and the notification centre (97:2564). Kept 90 days. */
export const notifications = core.table(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    /** The centre's filter chips: quotes · orders · team · alerts · account */
    category: text("category").notNull(),
    icon: text("icon").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    actionLabel: text("action_label"),
    /** Quiet hours hold an in-app notification until the morning (548:8). */
    visibleAt: utc("visible_at").notNull().defaultNow(),
    readAt: utc("read_at"),
    createdAt: utc("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.visibleAt),
    index("notifications_unread_idx")
      .on(t.userId)
      .where(sql`${t.readAt} IS NULL`),
  ],
);

/** One row per message per channel: what was sent, to whom, and what the provider said. */
export const notificationDeliveries = core.table(
  "notification_deliveries",
  {
    id: id(),
    event: text("event").notNull(),
    /** email · sms · whatsapp · in_app */
    channel: text("channel").notNull(),
    /** Registry id, for example email.sign_in_code or sms.otp_sign_in. */
    template: text("template").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Email address or mobile number. */
    recipient: text("recipient"),
    /** Sent · Failed · Skipped · Refused · Waiting */
    status: text("status").notNull(),
    /** Why it was skipped, refused or held: preference_off, unsubscribed, not_approved, quiet_hours, no_address */
    reason: text("reason"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    providerStatus: text("provider_status"),
    error: text("error"),
    /** The rendered message, kept only for messages that may be sent later (never for codes or links). */
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    attempts: integer("attempts").notNull().default(0),
    sendAfter: utc("send_after"),
    sentAt: utc("sent_at"),
    ...timestamps,
  },
  (t) => [
    index("deliveries_due_idx")
      .on(t.sendAfter)
      .where(sql`${t.status} IN ('Waiting', 'Failed')`),
    index("deliveries_user_idx").on(t.userId, t.createdAt),
  ],
);

/** A person's choices per topic and channel (577:288, 548:8). Only changes from the defaults are stored. */
export const notificationPreferences = core.table(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** A company's id for company settings (577:288, "each colleague sets theirs"), or '' for personal ones. */
    scope: text("scope").notNull().default(""),
    topic: text("topic").notNull(),
    channel: text("channel").notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: utc("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.scope, t.topic, t.channel] })],
);

/** Quiet hours and "Unsubscribe from everything" (548:8). */
export const notificationSettings = core.table("notification_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  quietHours: boolean("quiet_hours").notNull().default(false),
  /** IST "HH:MM" */
  quietFrom: text("quiet_from").notNull().default("22:00"),
  quietTo: text("quiet_to").notNull().default("07:00"),
  unsubscribedAll: boolean("unsubscribed_all").notNull().default(false),
  updatedAt: utc("updated_at").notNull().defaultNow(),
});

/** SMS (DLT) and WhatsApp template approval, set by a Super admin when the provider confirms (step 3.9, M5). */
export const templateApprovals = core.table("template_approvals", {
  template: text("template").primaryKey(),
  /** Not submitted · In review · Approved · Rejected */
  status: text("status").notNull(),
  providerTemplateId: text("provider_template_id"),
  updatedBy: uuid("updated_by").references(() => users.id),
  ...timestamps,
});
