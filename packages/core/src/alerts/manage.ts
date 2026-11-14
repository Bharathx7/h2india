import { schema, type Executor } from "@h2india/db";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { createAlert, type AlertInput } from "../members/alerts";
import { filteredSearch } from "../search/query";
import { ALERT_FILTER_FIELDS, filterExpression, isAlertType, type AlertType } from "./rules";

// The member's own alerts (Alerts 534:8, buyer Alerts 79:3425): list with this month's matches, edit, pause, delete.
// Every function takes the owner and changes nothing for anyone else's alert.

const a = schema.alerts;
const s = schema.alertSends;

/** Keeps only fields this alert type may filter on, as short string lists. */
export function cleanFilters(type: AlertType, filters: Record<string, unknown> | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const field of ALERT_FILTER_FIELDS[type]) {
    const v = filters?.[field];
    const list = (Array.isArray(v) ? v : [])
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .map((x) => x.trim().slice(0, 120))
      .slice(0, 20);
    if (list.length) out[field] = list;
  }
  return out;
}

export async function saveAlert(db: Executor, userId: string, input: AlertInput & { id?: string }) {
  if (!isAlertType(input.indexUid)) throw new Error("Choose what to be alerted about");
  const filters = cleanFilters(input.indexUid, input.filters);
  if (!input.id) return createAlert(db, userId, { ...input, filters });
  const [row] = await db
    .select()
    .from(a)
    .where(and(eq(a.id, input.id), eq(a.userId, userId), isNull(a.deletedAt)));
  if (!row) throw new Error("That alert isn't yours or no longer exists");
  const channels = (input.channels ?? row.channels).filter((c) => ["email", "whatsapp", "inapp"].includes(c));
  await db
    .update(a)
    .set({
      label: input.label.trim().slice(0, 120) || row.label,
      indexUid: input.indexUid,
      query: (input.query ?? "").slice(0, 200),
      filters,
      channels: channels.length ? channels : ["email"],
      frequency: ["instant", "daily", "weekly"].includes(input.frequency ?? "") ? input.frequency : row.frequency,
    })
    .where(eq(a.id, row.id));
  return { id: row.id };
}

/** The switch on each alert (534:8): off records when the member paused it. */
export async function setAlertOn(db: Executor, userId: string, id: string, on: boolean, now: Date = new Date()) {
  await db
    .update(a)
    .set(on ? { active: true, pausedAt: null } : { active: false, pausedAt: now })
    .where(and(eq(a.id, id), eq(a.userId, userId), isNull(a.deletedAt)));
}

/** Soft delete: the alert stops and leaves the list; what was sent stays logged. */
export async function deleteAlert(db: Executor, userId: string, id: string, now: Date = new Date()) {
  await db
    .update(a)
    .set({ deletedAt: now, active: false })
    .where(and(eq(a.id, id), eq(a.userId, userId), isNull(a.deletedAt)));
}

export interface AlertRow {
  id: string;
  label: string;
  type: AlertType;
  query: string;
  filters: Record<string, string[]>;
  channels: string[];
  frequency: string;
  on: boolean;
  pausedAt: Date | null;
  lastMatchedAt: Date | null;
  /** Matches since the 1st of this month ("5 matches this month"). */
  thisMonth: number;
  /** Matches in the last 7 days ("4 new this week", 79:3425). */
  thisWeek: number;
}

export async function myAlerts(db: Executor, userId: string, now: Date = new Date()): Promise<AlertRow[]> {
  const month = new Date(
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(now)}-01T00:00:00+05:30`,
  );
  const week = new Date(now.getTime() - 7 * 86_400_000);
  const rows = await db
    .select({
      a,
      thisMonth: sql<number>`count(${s.id}) filter (where ${s.matchedAt} >= ${month})::int`,
      thisWeek: sql<number>`count(${s.id}) filter (where ${s.matchedAt} >= ${week})::int`,
    })
    .from(a)
    .leftJoin(s, and(eq(s.alertId, a.id), gte(s.matchedAt, month < week ? month : week)))
    .where(and(eq(a.userId, userId), isNull(a.deletedAt)))
    .groupBy(a.id)
    .orderBy(desc(a.createdAt));
  return rows
    .filter((r) => isAlertType(r.a.indexUid))
    .map((r) => ({
      id: r.a.id,
      label: r.a.label,
      type: r.a.indexUid as AlertType,
      query: r.a.query,
      filters: r.a.filters,
      channels: r.a.channels,
      frequency: r.a.frequency,
      on: r.a.active && !r.a.pausedAt,
      pausedAt: r.a.pausedAt,
      lastMatchedAt: r.a.lastMatchedAt,
      thisMonth: r.thisMonth,
      thisWeek: r.thisWeek,
    }));
}

/** What the alert would match today (Create alert, step 3: "14 tenders match"), with the first three. */
export async function previewAlert(type: AlertType, query: string, filters: Record<string, string[]>) {
  return filteredSearch(type, query, filterExpression(type, cleanFilters(type, filters)), { limit: 3 });
}

/** The member's alert on one record (Track tender, a scheme's next round), if they have one. */
export async function recordAlert(db: Executor, userId: string, type: AlertType, recordId: string) {
  const rows = await db
    .select()
    .from(a)
    .where(and(eq(a.userId, userId), eq(a.indexUid, type), isNull(a.deletedAt)));
  return rows.find((r) => r.filters.id?.includes(recordId)) ?? null;
}

/** "How we reach you" (534:8): the email, and the mobile masked as "+91 ••••• 32109" only once it is confirmed. */
export async function alertContacts(db: Executor, userId: string): Promise<{ email: string; mobile: string | null }> {
  const [u] = await db
    .select({ email: schema.users.email, mobile: schema.users.mobile, verified: schema.users.mobileVerifiedAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  const digits = (u?.mobile ?? "").replace(/\D/g, "");
  return {
    email: u?.email ?? "",
    mobile: u?.verified && digits.length >= 10 ? `+91 ••••• ${digits.slice(-5)}` : null,
  };
}
