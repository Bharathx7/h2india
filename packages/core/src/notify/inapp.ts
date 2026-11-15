import { schema, type Executor } from "@h2india/db";
import { and, count, desc, eq, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import type { Category } from "./topics";

// In-app notifications (step 3.9): the bell panel (97:3168) and the notification centre (97:2564). Kept 90 days.

const { notifications: n } = schema;

export const KEEP_DAYS = 90;

export interface InAppInput {
  userId: string;
  event: string;
  category: Category;
  /** An icon name from the design system, for example file-text, truck, shield-check. */
  icon: string;
  title: string;
  body?: string;
  href?: string;
  actionLabel?: string;
  visibleAt?: Date;
}

export async function createInApp(ex: Executor, input: InAppInput): Promise<string> {
  const [row] = await ex
    .insert(n)
    .values({
      userId: input.userId,
      event: input.event,
      category: input.category,
      icon: input.icon,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      actionLabel: input.actionLabel ?? null,
      visibleAt: input.visibleAt ?? new Date(),
    })
    .returning({ id: n.id });
  if (!row) throw new Error("notification insert returned nothing");
  return row.id;
}

export type InboxFilter = "all" | "unread" | Category;

export async function listNotifications(
  ex: Executor,
  userId: string,
  opts: { filter?: InboxFilter; limit?: number; before?: Date; now?: Date } = {},
) {
  const filter = opts.filter ?? "all";
  return (
    ex
      .select()
      .from(n)
      .where(
        and(
          eq(n.userId, userId),
          lte(n.visibleAt, opts.now ?? new Date()),
          filter === "unread" ? isNull(n.readAt) : filter === "all" ? undefined : eq(n.category, filter),
          opts.before ? lt(n.visibleAt, opts.before) : undefined,
        ),
      )
      // Ids are UUID v7 (time-ordered), so they break ties between notifications made in the same millisecond.
      .orderBy(desc(n.visibleAt), desc(n.id))
      .limit(Math.min(opts.limit ?? 50, 200))
  );
}

export async function unreadCount(ex: Executor, userId: string, now: Date = new Date()): Promise<number> {
  const [row] = await ex
    .select({ c: count() })
    .from(n)
    .where(and(eq(n.userId, userId), isNull(n.readAt), lte(n.visibleAt, now)));
  return row?.c ?? 0;
}

/** Marks some or all of the person's notifications read. Only ever their own. */
export async function markRead(ex: Executor, userId: string, ids: string[] | "all"): Promise<number> {
  const rows = await ex
    .update(n)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(n.userId, userId),
        isNull(n.readAt),
        lte(n.visibleAt, new Date()),
        ids === "all" ? undefined : inArray(n.id, ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]),
      ),
    )
    .returning({ id: n.id });
  return rows.length;
}

/** "We keep notifications for 90 days" (97:2564). Scheduled daily. */
export async function pruneNotifications(ex: Executor): Promise<number> {
  const rows = await ex
    .delete(n)
    .where(lt(n.createdAt, sql`now() - make_interval(days => ${KEEP_DAYS})`))
    .returning({ id: n.id });
  return rows.length;
}
