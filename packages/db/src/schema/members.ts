import { sql } from "drizzle-orm";
import { boolean, index, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

/**
 * A member's profile (step 7.1 onboarding 531:8; step 7.4 profile 545:8). Persona, topics and states drive the feed
 * and suggestions. `listed` is the member's own opt-in to the people directory (M24, step 7.4).
 */
export const memberProfiles = core.table("member_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  /** enthusiast, student, researcher, professional */
  persona: text("persona"),
  topics: text("topics")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  states: text("states")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** Finished or skipped onboarding: it isn't offered again. */
  onboardedAt: utc("onboarded_at"),
  listed: boolean("listed").notNull().default(false),
  /** Public profile fields (545:8), shown only when listed. */
  profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: utc("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: utc("updated_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * One follow model for the whole site (step 7.2): a person follows a topic, a state, a company, a scheme, a tender
 * category or anything else followable. `label` and `href` keep Manage follows (543:8) readable without joins.
 */
export const follows = core.table(
  "follows",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** topic, state, company, scheme, tender, event, person */
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    label: text("label").notNull(),
    href: text("href"),
    /** Manage follows (543:8): all (feed and in-app), digest (feed and weekly email), none (feed only). */
    level: text("level").notNull().default("all"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("follows_one").on(t.userId, t.targetType, t.targetId),
    index("follows_target").on(t.targetType, t.targetId),
  ],
);

/**
 * Alerts (step 7.3; Alerts 534:8, Create alert 534:587): a saved search on one index with channels and a frequency.
 * Sends are logged in alert_sends so the same record never goes to the same alert twice.
 */
export const alerts = core.table(
  "alerts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    label: text("label").notNull(),
    /** tenders, schemes, grants, jobs, articles, products, events */
    indexUid: text("index_uid").notNull(),
    query: text("query").notNull().default(""),
    filters: jsonb("filters").$type<Record<string, string[]>>().notNull().default({}),
    /** email, whatsapp, inapp */
    channels: text("channels")
      .array()
      .notNull()
      .default(sql`'{email}'::text[]`),
    /** instant, daily, weekly */
    frequency: text("frequency").notNull().default("weekly"),
    active: boolean("active").notNull().default(true),
    lastSentAt: utc("last_sent_at"),
    /** The last time a new record matched (534:8 "Last matched 2 days ago"). */
    lastMatchedAt: utc("last_matched_at"),
    /** When the member paused it (534:8 "Paused by you on 1 Nov 2026"); null while on. */
    pausedAt: utc("paused_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    deletedAt: utc("deleted_at"),
  },
  (t) => [index("alerts_owner").on(t.userId), index("alerts_index").on(t.indexUid, t.active)],
);

/**
 * One record matched to one alert (step 7.3). Unique on (alert, record), so a record is never sent twice to the same
 * alert, however often it is updated. What the message shows is copied from the search document when it matched.
 * sentAt is set when it went out (alone for instant alerts, or in a digest); every send is also in core.deliveries.
 */
export const alertSends = core.table(
  "alert_sends",
  {
    id: id(),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => alerts.id),
    recordId: text("record_id").notNull(),
    title: text("title").notNull(),
    meta: text("meta").notNull().default(""),
    href: text("href").notNull(),
    /** Fields the messages need: issuer, reference, due date, states. */
    detail: jsonb("detail").$type<Record<string, string>>().notNull().default({}),
    matchedAt: utc("matched_at")
      .notNull()
      .default(sql`now()`),
    sentAt: utc("sent_at"),
  },
  (t) => [
    uniqueIndex("alert_sends_once").on(t.alertId, t.recordId),
    index("alert_sends_waiting")
      .on(t.alertId)
      .where(sql`${t.sentAt} IS NULL`),
  ],
);

/**
 * Saved items (step 7.2; 541:8): anything saved from any page, private to the member. Title, meta and link are kept
 * so the list reads without joins; unfollowing never removes saved items.
 */
export const savedItems = core.table(
  "saved_items",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** article, product, tender, scheme, grant, event, job, company */
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    title: text("title").notNull(),
    href: text("href").notNull(),
    /** "News · 28 Oct 2026" */
    meta: text("meta"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("saved_items_one").on(t.userId, t.targetType, t.targetId),
    index("saved_items_owner").on(t.userId, t.createdAt),
  ],
);
