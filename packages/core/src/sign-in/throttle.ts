import { schema, type Executor } from "@h2india/db";
import { and, eq, gt, sql } from "drizzle-orm";

// Counters per email for the sign-in rules Better Auth lacks (ADR 0003): codes sent, wrong codes, pauses.
// Each hit is one atomic upsert, so parallel requests cannot slip past a limit.

const { signInThrottle: t } = schema;

export interface ThrottleState {
  count: number;
  expiresAt: Date;
}

/** Adds one to the counter. A counter whose window has ended starts again at 1 with a new window. */
export async function hitThrottle(ex: Executor, key: string, windowSeconds: number): Promise<ThrottleState> {
  const rows = await ex
    .insert(t)
    .values({ key, count: 1, expiresAt: sql`now() + make_interval(secs => ${windowSeconds})` })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`CASE WHEN ${t.expiresAt} <= now() THEN 1 ELSE ${t.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${t.expiresAt} <= now() THEN excluded.expires_at ELSE ${t.expiresAt} END`,
      },
    })
    .returning({ count: t.count, expiresAt: t.expiresAt });
  const row = rows[0];
  if (!row) throw new Error(`throttle ${key}: upsert returned no row`);
  return row;
}

/** Starts (or restarts) a window without counting, for example a pause. */
export async function startThrottle(ex: Executor, key: string, seconds: number): Promise<ThrottleState> {
  const rows = await ex
    .insert(t)
    .values({ key, count: 1, expiresAt: sql`now() + make_interval(secs => ${seconds})` })
    .onConflictDoUpdate({ target: t.key, set: { count: 1, expiresAt: sql`excluded.expires_at` } })
    .returning({ count: t.count, expiresAt: t.expiresAt });
  const row = rows[0];
  if (!row) throw new Error(`throttle ${key}: upsert returned no row`);
  return row;
}

/** The counter, if its window is still open. */
export async function readThrottle(ex: Executor, key: string): Promise<ThrottleState | null> {
  const rows = await ex
    .select({ count: t.count, expiresAt: t.expiresAt })
    .from(t)
    .where(and(eq(t.key, key), gt(t.expiresAt, sql`now()`)));
  return rows[0] ?? null;
}

export async function clearThrottle(ex: Executor, key: string): Promise<void> {
  await ex.delete(t).where(eq(t.key, key));
}

/** Removes counters whose window ended more than a day ago. Run by the scheduled clean-up (step 3.8). */
export async function pruneThrottle(ex: Executor): Promise<number> {
  const rows = await ex
    .delete(t)
    .where(sql`${t.expiresAt} < now() - interval '1 day'`)
    .returning({ key: t.key });
  return rows.length;
}
