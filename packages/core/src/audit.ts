import { auditLog, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, gte, lt, lte, sql, type SQL } from "drizzle-orm";
import type { Actor } from "./authz/actor";
import { assertCan } from "./authz/can";

// Audit log (step 3.6): every important action records who did what to which record, when, from where and
// why. The table is append-only at the database level. Sensitive values are masked before they are stored.

export interface RequestContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditEntry {
  actorId?: string | null;
  actingAsId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  companyId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  context?: RequestContext;
}

const SECRET = /(password|secret|token|otp|code_hash|^code$|api_?key|private)/i;
const LAST_FOUR = /(account_?number|accountNumber|card|aadhaar|pan_?number|panNumber|ifsc)/i;
/** Mobile and phone numbers (keys ending in mobile, phone or phoneNumber) keep their last four digits. */
const PHONE = /(mobile|phone)(_?number)?$/i;

/** Masks secrets fully and identity or bank numbers down to their last four characters. */
export function mask(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => mask(v, key));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, mask(v, k)]));
  }
  if (SECRET.test(key)) return "••••";
  if ((LAST_FOUR.test(key) || PHONE.test(key)) && typeof value === "string") return `••••${value.slice(-4)}`;
  return value;
}

export async function audit(ex: Executor, entry: AuditEntry): Promise<void> {
  await ex.insert(auditLog).values({
    actorId: entry.actorId ?? null,
    actingAsId: entry.actingAsId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    companyId: entry.companyId ?? null,
    before: (mask(entry.before ?? null) as Record<string, unknown> | null) ?? null,
    after: (mask(entry.after ?? null) as Record<string, unknown> | null) ?? null,
    reason: entry.reason ?? null,
    ip: entry.context?.ip ?? null,
    userAgent: entry.context?.userAgent ?? null,
    requestId: entry.context?.requestId ?? null,
  });
}

/** Entries are kept for 8 years (decision A18), then removed by pruneAuditLog(). */
export const AUDIT_RETENTION_YEARS = 8;

/**
 * The retention job (step 3.8 schedules it): removes entries older than the retention period and records how many.
 * The database refuses every other UPDATE or DELETE on the log.
 */
export async function pruneAuditLog(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL h2.audit_retention = 'on'`);
    const removed = await tx
      .delete(auditLog)
      .where(lt(auditLog.at, sql`now() - make_interval(years => ${AUDIT_RETENTION_YEARS})`))
      .returning({ id: auditLog.id });
    await audit(tx, {
      actorId: null,
      action: "audit.retention",
      resourceType: "audit_log",
      after: { removed: removed.length, olderThanYears: AUDIT_RETENTION_YEARS },
    });
    return removed.length;
  });
}

export interface AuditFilter {
  from?: Date;
  to?: Date;
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  companyId?: string;
  /** Words to find in the action, record type, record id or reason (the Audit log's search box). */
  text?: string;
}

function filterSql(f: AuditFilter): SQL | undefined {
  return and(
    f.from ? gte(auditLog.at, f.from) : undefined,
    f.to ? lte(auditLog.at, f.to) : undefined,
    f.actorId ? eq(auditLog.actorId, f.actorId) : undefined,
    f.action ? eq(auditLog.action, f.action) : undefined,
    f.resourceType ? eq(auditLog.resourceType, f.resourceType) : undefined,
    f.resourceId ? eq(auditLog.resourceId, f.resourceId) : undefined,
    f.companyId ? eq(auditLog.companyId, f.companyId) : undefined,
    f.text
      ? sql`(${auditLog.action} ilike ${`%${f.text}%`} or ${auditLog.resourceType} ilike ${`%${f.text}%`} or ${auditLog.resourceId} ilike ${`%${f.text}%`} or ${auditLog.reason} ilike ${`%${f.text}%`})`
      : undefined,
  );
}

/**
 * Newest first, a page at a time (cursor = the last entry's time). For the admin Audit log screen (656:872, step 11.4),
 * which sits with Users: reading needs users.view.
 */
export async function readAuditLog(
  ex: Executor,
  actor: Actor,
  filter: AuditFilter,
  page: { limit?: number; before?: Date; offset?: number } = {},
) {
  assertCan(actor, "users.view");
  return ex
    .select()
    .from(auditLog)
    .where(and(filterSql(filter), page.before ? lt(auditLog.at, page.before) : undefined))
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(Math.min(page.limit ?? 50, 500))
    .offset(page.offset ?? 0);
}

/** How many entries match, for the Audit log's pager (founder QC, 17 Nov 2026: it stopped at the newest 200). */
export async function countAuditLog(ex: Executor, actor: Actor, filter: AuditFilter): Promise<number> {
  assertCan(actor, "users.view");
  const [row] = await ex
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(filterSql(filter));
  return row?.n ?? 0;
}

const CSV_COLUMNS = [
  "at",
  "actorId",
  "actingAsId",
  "action",
  "resourceType",
  "resourceId",
  "companyId",
  "reason",
  "ip",
  "requestId",
  "before",
  "after",
] as const;

function csvCell(value: unknown): string {
  let text = "";
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === "string") text = value;
  else if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    text = value.toString();
  else if (typeof value === "object" && value !== null) text = JSON.stringify(value);
  // Cells starting with = + - @ are treated as formulas by spreadsheets; prefix them so they stay text.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV of the matching entries (values already masked when written). Needs users.export; the export is itself audited. */
export async function exportAuditCsv(
  ex: Executor,
  actor: Actor,
  filter: AuditFilter,
  context?: RequestContext,
): Promise<string> {
  assertCan(actor, "users.export");
  const rows = await ex.select().from(auditLog).where(filterSql(filter)).orderBy(desc(auditLog.at)).limit(100_000);
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
  await audit(ex, {
    actorId: actor.userId,
    action: "audit.export",
    resourceType: "audit_log",
    after: { rows: rows.length, filter: { ...filter, from: filter.from?.toISOString(), to: filter.to?.toISOString() } },
    context,
  });
  return lines.join("\n") + "\n";
}

/** The record types in the log, for the Audit log's Object type filter. */
export async function auditResourceTypes(ex: Executor, actor: Actor): Promise<string[]> {
  assertCan(actor, "users.view");
  const rows = await ex.selectDistinct({ t: auditLog.resourceType }).from(auditLog).orderBy(auditLog.resourceType);
  return rows.map((r) => r.t);
}
