import { integer, primaryKey, text } from "drizzle-orm/pg-core";
import { core } from "./core";

/**
 * First-party page views (A176, M10 stand-in): one counter per public page per IST day, recorded only after the
 * visitor accepts analytics cookies, never for operators. No person, cookie id or IP is stored.
 */
export const pageViews = core.table(
  "page_views",
  {
    /** IST date, YYYY-MM-DD. */
    day: text("day").notNull(),
    /** The page's path without its query, for example /news/green-ammonia-tender. */
    path: text("path").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.path] })],
);
