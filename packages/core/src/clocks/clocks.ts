import { CLOCKS, type ClockName, type Duration } from "@h2india/config/clocks";
import { schema, type Executor } from "@h2india/db";
import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { getSetting, defineSetting, type SettingDef } from "../settings";
import { istDay, WorkingCalendar } from "./calendar";

// Clocks and the deadline engine (step 3.8). A record registers a deadline (type, due at, warn at); the engine emits
// warn and expire exactly once each, even after a restart, because each event is claimed in the database in the same
// transaction as its handler. The queue's one-minute tick is only the alarm clock.

const { holidays: h, deadlines: d } = schema;
type DeadlineRow = typeof d.$inferSelect;

const durationSchema: z.ZodType<Duration> = z.union([
  z.object({ hours: z.number().positive() }).strict(),
  z.object({ workingDays: z.number().int().positive() }).strict(),
  z.object({ days: z.number().int().positive() }).strict(),
]);

/** Each clock is a setting (System settings, step 11.8) whose fallback is the drawn value (A24). */
export const CLOCK_SETTINGS = Object.fromEntries(
  (Object.keys(CLOCKS) as ClockName[]).map((name) => [
    name,
    defineSetting<Duration>({
      key: `clock.${name}`,
      description: CLOCKS[name].label,
      schema: durationSchema,
      fallback: CLOCKS[name].duration,
    }),
  ]),
) as Record<ClockName, SettingDef<Duration>>;

export async function clockDuration(ex: Executor, name: ClockName): Promise<Duration> {
  return getSetting(ex, CLOCK_SETTINGS[name]);
}

// ---------------------------------------------------------------------------------------------- calendar

let cached: { at: number; calendar: WorkingCalendar } | undefined;

/** The working-day calendar with the holiday list from the database (cached for a minute). */
export async function workingCalendar(ex: Executor, opts: { fresh?: boolean } = {}): Promise<WorkingCalendar> {
  if (!opts.fresh && cached && Date.now() - cached.at < 60_000) return cached.calendar;
  const rows = await ex
    .select({ day: h.day })
    .from(h)
    .where(gte(h.day, sql`(now() - interval '2 years')::date`));
  cached = { at: Date.now(), calendar: new WorkingCalendar(new Set(rows.map((r) => r.day))) };
  return cached.calendar;
}

/** A Super admin keeps the holiday list (M18). Audited. */
export async function setHoliday(
  ex: Executor,
  actor: Actor,
  input: { day: string; name: string; source?: string },
  context?: RequestContext,
) {
  assertCan(actor, "settings.edit");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day) || istDay(new Date(`${input.day}T12:00:00+05:30`)) !== input.day) {
    throw new Error("Enter the date as YYYY-MM-DD");
  }
  const name = input.name.trim();
  if (!name) throw new Error("Enter the holiday's name");
  await ex.transaction(async (tx) => {
    const [before] = await tx.select().from(h).where(eq(h.day, input.day));
    await tx
      .insert(h)
      .values({ day: input.day, name, source: input.source ?? null, updatedBy: actor.userId })
      .onConflictDoUpdate({
        target: h.day,
        set: { name, source: input.source ?? null, updatedBy: actor.userId, updatedAt: new Date() },
      });
    await audit(tx, {
      actorId: actor.userId,
      action: "holiday.set",
      resourceType: "holiday",
      resourceId: input.day,
      before: before ? { name: before.name } : null,
      after: { name },
      context,
    });
  });
  cached = undefined;
}

/**
 * The holiday list for System settings (founder QC, 17 Nov 2026: M18 says operators keep it there, but there was no
 * screen): from the start of last year, by date. Operators with settings.view.
 */
export async function listHolidays(ex: Executor, actor: Actor) {
  assertCan(actor, "settings.view");
  return ex
    .select({ day: h.day, name: h.name, source: h.source })
    .from(h)
    .where(gte(h.day, sql`date_trunc('year', now() - interval '1 year')::date`))
    .orderBy(asc(h.day));
}

export async function removeHoliday(ex: Executor, actor: Actor, day: string, context?: RequestContext) {
  assertCan(actor, "settings.edit");
  await ex.transaction(async (tx) => {
    const [before] = await tx.delete(h).where(eq(h.day, day)).returning();
    if (!before) return;
    await audit(tx, {
      actorId: actor.userId,
      action: "holiday.remove",
      resourceType: "holiday",
      resourceId: day,
      before: { name: before.name },
      context,
    });
  });
  cached = undefined;
}

// ---------------------------------------------------------------------------------------------- deadlines

export interface Subject {
  subjectType: string;
  subjectId: string;
}

/**
 * Starts a deadline from a clock, for example supplierAcceptsOrder on an order. Its due time is fixed now, so a later
 * change to the clock applies to new deadlines only. A second start for the same open subject keeps the first.
 */
export async function startClock(
  ex: Executor,
  input: Subject & { clock: ClockName; from?: Date; warn?: ClockName | Duration },
): Promise<DeadlineRow> {
  const from = input.from ?? new Date();
  const calendar = await workingCalendar(ex);
  const dueAt = calendar.add(from, await clockDuration(ex, input.clock));
  const warn =
    typeof input.warn === "string" ? await clockDuration(ex, input.warn) : (input.warn satisfies Duration | undefined);
  return startDeadline(ex, {
    type: input.clock,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    startedAt: from,
    dueAt,
    warnAt: warn ? calendar.add(from, warn) : null,
  });
}

export async function startDeadline(
  ex: Executor,
  input: Subject & { type: string; startedAt?: Date; dueAt: Date; warnAt?: Date | null },
): Promise<DeadlineRow> {
  const [row] = await ex
    .insert(d)
    .values({
      type: input.type,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      startedAt: input.startedAt ?? new Date(),
      dueAt: input.dueAt,
      warnAt: input.warnAt ?? null,
    })
    .onConflictDoNothing()
    .returning();
  if (row) return row;
  const [open] = await ex
    .select()
    .from(d)
    .where(
      and(
        eq(d.type, input.type),
        eq(d.subjectType, input.subjectType),
        eq(d.subjectId, input.subjectId),
        eq(d.status, "Open"),
      ),
    );
  if (!open) throw new Error("deadline insert returned nothing");
  return open;
}

async function close(ex: Executor, input: Subject & { type: string }, status: "Done" | "Cancelled") {
  await ex
    .update(d)
    .set({ status, closedAt: new Date() })
    .where(
      and(
        eq(d.type, input.type),
        eq(d.subjectType, input.subjectType),
        eq(d.subjectId, input.subjectId),
        eq(d.status, "Open"),
      ),
    );
}

/** The thing the clock waited for happened (the supplier accepted). No more events. */
export async function completeDeadline(ex: Executor, input: Subject & { type: string }) {
  await close(ex, input, "Done");
}

export async function cancelDeadline(ex: Executor, input: Subject & { type: string }) {
  await close(ex, input, "Cancelled");
}

export type DeadlineEvent = "warn" | "expire";
export type DeadlineHandler = (tx: Executor, deadline: DeadlineRow, event: DeadlineEvent) => Promise<void>;

const handlers = new Map<string, DeadlineHandler>();

/** What happens when a deadline of this type warns or expires (a reminder, an overdue state). One per type. */
export function onDeadline(type: string, handler: DeadlineHandler): void {
  handlers.set(type, handler);
}

/**
 * One tick of the engine: claims due warn and expire events and runs their handlers. Each event is claimed and handled
 * in its own transaction, so it happens exactly once; a handler that throws is retried on the next tick.
 */
export async function runDeadlines(db: Executor, now: Date = new Date(), limit = 200) {
  const result = { warned: 0, expired: 0, failed: 0 };
  for (const event of ["warn", "expire"] as const) {
    const at = event === "warn" ? d.warnAt : d.dueAt;
    const done = event === "warn" ? d.warnedAt : d.expiredAt;
    const due = await db
      .select({ id: d.id })
      .from(d)
      .where(and(eq(d.status, "Open"), isNull(done), lte(at, now)))
      .orderBy(at)
      .limit(limit);
    for (const { id } of due) {
      try {
        const claimed = await db.transaction(async (tx) => {
          const [row] = await tx
            .update(d)
            .set(event === "warn" ? { warnedAt: now } : { expiredAt: now })
            .where(and(eq(d.id, id), eq(d.status, "Open"), isNull(done)))
            .returning();
          if (!row) return false;
          await handlers.get(row.type)?.(tx, row, event);
          return true;
        });
        if (claimed) result[event === "warn" ? "warned" : "expired"]++;
      } catch (error) {
        result.failed++;
        console.error(`deadline ${id} ${event}:`, error);
      }
    }
  }
  return result;
}

export type SlaColour = "green" | "amber" | "red";

/** Queue colours (707:793): amber after 24 hours, red after 48 hours by default. */
export async function slaColour(ex: Executor, startedAt: Date, now: Date = new Date()): Promise<SlaColour> {
  const calendar = await workingCalendar(ex);
  if (now >= calendar.add(startedAt, await clockDuration(ex, "queueRed"))) return "red";
  if (now >= calendar.add(startedAt, await clockDuration(ex, "queueAmber"))) return "amber";
  return "green";
}
