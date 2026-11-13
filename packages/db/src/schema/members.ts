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
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    deletedAt: utc("deleted_at"),
  },
  (t) => [index("alerts_owner").on(t.userId), index("alerts_index").on(t.indexUid, t.active)],
);
