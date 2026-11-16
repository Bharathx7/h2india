import { schema, type Executor } from "@h2india/db";
import { and, desc, gte, like, sql } from "drizzle-orm";
import { trimEndChars } from "../text-checks";

// First-party analytics (A176, the M10 stand-in): a count per public page per IST day. The browser sends a view only
// after the visitor accepts analytics cookies and never for operators (consent/Analytics.tsx); nothing here stores a
// person, a cookie id or an IP. Feeds "Most read this week" (428:950) and "Popular this month" (440:40), A58.

const PRIVATE = /^\/(admin|buyer|supplier|member|cms|api|dev|d|checkout|cart|sign-in|join|notifications|account)(\/|$)/;

/** The path as counted: no query or hash, no trailing slash, at most 200 characters; null for private pages. */
export function countedPath(raw: string): string | null {
  let path = raw.split(/[?#]/)[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.length > 1) path = trimEndChars(path, "/") || "/";
  if (path.length > 200 || PRIVATE.test(path)) return null;
  if (!/^[\w\-/.~%]*$/.test(path)) return null;
  return path;
}

const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export async function recordPageView(ex: Executor, rawPath: string, at: Date = new Date()): Promise<boolean> {
  const path = countedPath(rawPath);
  if (!path) return false;
  await ex
    .insert(schema.pageViews)
    .values({ day: istDay(at), path, views: 1 })
    .onConflictDoUpdate({
      target: [schema.pageViews.day, schema.pageViews.path],
      set: { views: sql`${schema.pageViews.views} + 1` },
    });
  return true;
}

/** The most viewed paths under a prefix over the last `days` days, most viewed first. */
export async function popularPaths(
  ex: Executor,
  input: { prefix: string; days: number; limit: number; now?: Date },
): Promise<{ path: string; views: number }[]> {
  const from = istDay(new Date((input.now ?? new Date()).getTime() - (input.days - 1) * 86_400_000));
  const v = schema.pageViews;
  const rows = await ex
    .select({ path: v.path, views: sql<number>`sum(${v.views})::int` })
    .from(v)
    .where(and(gte(v.day, from), like(v.path, `${input.prefix.replace(/[%_]/g, "")}%`)))
    .groupBy(v.path)
    .orderBy(desc(sql`sum(${v.views})`))
    .limit(input.limit);
  return rows;
}
