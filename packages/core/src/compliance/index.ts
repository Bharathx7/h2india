import { schema, type Executor } from "@h2india/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";

// Compliance (step 11.7): data-rights requests and grievance escalation.
export * from "./data-rights";
export * from "./escalation";

/** The acknowledge clock of each grievance (Grievances 660:281): when it's due and whether it was met. Read-only. */
export async function grievanceClocks(db: Executor, actor: Actor, ids: string[]) {
  assertCan(actor, "compliance.view");
  if (!ids.length) return new Map<string, { type: string; dueAt: Date; status: string; closedAt: Date | null }[]>();
  const d = schema.deadlines;
  const rows = await db
    .select({ subjectId: d.subjectId, type: d.type, dueAt: d.dueAt, status: d.status, closedAt: d.closedAt })
    .from(d)
    .where(and(eq(d.subjectType, "grievance"), inArray(d.subjectId, ids)));
  const out = new Map<string, { type: string; dueAt: Date; status: string; closedAt: Date | null }[]>();
  for (const r of rows) out.set(r.subjectId, [...(out.get(r.subjectId) ?? []), r]);
  return out;
}

/**
 * Takedown requests (660:851): reports from listing pages ("Report this listing", step 6.3), newest first, with the
 * listing they are about. Read-only; there's no takedown clock until M2 sets the time limits.
 */
export async function listTakedowns(db: Executor, actor: Actor) {
  assertCan(actor, "compliance.view");
  const lr = schema.listingReports;
  const p = schema.products;
  return db
    .select({
      id: lr.id,
      problem: lr.problem,
      details: lr.details,
      attachments: lr.attachments,
      status: lr.status,
      createdAt: lr.createdAt,
      product: p.name,
      slug: p.slug,
    })
    .from(lr)
    .innerJoin(p, eq(p.id, lr.productId))
    .orderBy(desc(lr.createdAt))
    .limit(300);
}
