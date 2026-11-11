import { auditLog, type Executor } from "@h2india/db";

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

/** Masks secrets fully and identity or bank numbers down to their last four characters. */
export function mask(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => mask(v, key));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, mask(v, k)]));
  }
  if (SECRET.test(key)) return "••••";
  if (LAST_FOUR.test(key) && typeof value === "string") return `••••${value.slice(-4)}`;
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
