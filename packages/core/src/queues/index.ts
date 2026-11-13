import { schema, type Database, type Executor } from "@h2india/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";

// The queue framework (step 11.2): claiming and deciding, shared by the seven queues. An operator claims an item
// (Assign to me), or it is claimed for them when they decide; only the claimant can decide, and only once, so two
// operators can never decide the same item. Every claim and decision is audit-logged with its reasons.

export const QUEUES = [
  { key: "suppliers", label: "Suppliers", sla: "review within 2 working days" },
  { key: "listings", label: "Listings", sla: "review within 1 working day" },
  { key: "rfqs", label: "RFQs", sla: "moderate within 1 working day" },
  { key: "content", label: "Content", sla: "review within 1 working day" },
  { key: "events", label: "Events", sla: "review within 1 working day" },
  { key: "jobs", label: "Jobs", sla: "review within 1 working day" },
  { key: "comments", label: "Comments", sla: "review within 1 working day" },
] as const;
export type QueueKey = (typeof QUEUES)[number]["key"];
export type Decision = "approve" | "changes" | "reject";

export class QueueError extends Error {}

const c = schema.queueClaims;

async function nameOf(ex: Executor, userId: string | null) {
  if (!userId) return "someone";
  const [u] = await ex.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, userId));
  return u?.name ?? "someone";
}

/** Assign to me, or reassign to another operator (Reassign). Refused once the item is decided. */
export async function claimItem(
  db: Database,
  actor: Actor,
  input: { queue: QueueKey; subjectId: string; to?: string | null },
  context?: RequestContext,
) {
  assertCan(actor, "queues.edit");
  const to = input.to === undefined ? actor.userId : input.to;
  await db.transaction(async (tx) => {
    await tx.insert(c).values({ queue: input.queue, subjectId: input.subjectId }).onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(c)
      .where(and(eq(c.queue, input.queue), eq(c.subjectId, input.subjectId)))
      .for("update");
    if (!row) throw new Error("claim row missing");
    if (row.decidedAt) throw new QueueError(`${await nameOf(tx, row.decidedBy)} has already decided this`);
    await tx
      .update(c)
      .set({ claimedBy: to, claimedAt: to ? new Date() : null })
      .where(eq(c.id, row.id));
    await audit(tx, {
      actorId: actor.userId,
      action: to ? "queue.claimed" : "queue.released",
      resourceType: input.queue,
      resourceId: input.subjectId,
      before: { claimedBy: row.claimedBy },
      after: { claimedBy: to },
      context,
    });
  });
}

/**
 * Record a decision. Claims the item for the operator if nobody has; refuses if someone else holds it or it was
 * already decided. `apply` makes the change in the item's own home and sends its message; if it fails the decision is
 * undone, so the item can be decided again.
 */
export async function decideItem(
  db: Database,
  actor: Actor,
  input: { queue: QueueKey; subjectId: string; decision: Decision; reasons?: string[] },
  apply: () => Promise<void>,
  context?: RequestContext,
) {
  assertCan(actor, "queues.edit");
  if (!actor.userId) throw new QueueError("Sign in again");
  const me = actor.userId;
  const reasons = (input.reasons ?? []).map((r) => r.trim()).filter(Boolean);
  if (input.decision !== "approve" && !reasons.length) throw new QueueError("Say what needs to change, or why");
  const claimId = await db.transaction(async (tx) => {
    await tx.insert(c).values({ queue: input.queue, subjectId: input.subjectId }).onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(c)
      .where(and(eq(c.queue, input.queue), eq(c.subjectId, input.subjectId)))
      .for("update");
    if (!row) throw new Error("claim row missing");
    if (row.decidedAt) throw new QueueError(`${await nameOf(tx, row.decidedBy)} has already decided this`);
    if (row.claimedBy && row.claimedBy !== me)
      throw new QueueError(`${await nameOf(tx, row.claimedBy)} is reviewing this. Ask them, or reassign it first`);
    const now = new Date();
    await tx
      .update(c)
      .set({
        claimedBy: me,
        claimedAt: row.claimedAt ?? now,
        decision: input.decision,
        reasons,
        decidedBy: me,
        decidedAt: now,
      })
      .where(eq(c.id, row.id));
    await audit(tx, {
      actorId: me,
      action: `queue.${input.decision}`,
      resourceType: input.queue,
      resourceId: input.subjectId,
      after: { decision: input.decision, reasons },
      context,
    });
    return row.id;
  });
  try {
    await apply();
  } catch (error) {
    await db.update(c).set({ decision: null, decidedBy: null, decidedAt: null }).where(eq(c.id, claimId));
    throw error;
  }
}

/** Claims for items in a queue, for the Assignee and Status columns. */
export async function claimsFor(db: Executor, queue: QueueKey, subjectIds: string[]) {
  if (!subjectIds.length)
    return new Map<string, { claimedBy: string | null; name: string | null; decision: string | null }>();
  const rows = await db
    .select({
      subjectId: c.subjectId,
      claimedBy: c.claimedBy,
      decision: c.decision,
      name: sql<string | null>`(select u.name from core.users u where u.id = core.queue_claims.claimed_by)`,
    })
    .from(c)
    .where(and(eq(c.queue, queue), inArray(c.subjectId, subjectIds)));
  return new Map(rows.map((r) => [r.subjectId, r]));
}

/** The people who submitted queue items: name, email and whether both are verified. Operators with queues.view. */
export async function submitters(db: Executor, actor: Actor, userIds: string[]) {
  assertCan(actor, "queues.view");
  const ids = [...new Set(userIds.filter((x) => /^[0-9a-f-]{36}$/i.test(x)))];
  if (!ids.length) return new Map<string, { name: string; email: string; verified: boolean }>();
  const u = schema.users;
  const rows = await db
    .select({ id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, mobile: u.mobileVerifiedAt })
    .from(u)
    .where(inArray(u.id, ids));
  return new Map(
    rows.map((r) => [r.id, { name: r.name, email: r.email, verified: r.emailVerified && r.mobile !== null }]),
  );
}

/** Companies behind queue items: name and whether they hold the Verified badge. */
export async function companiesBrief(db: Executor, actor: Actor, organisationIds: string[]) {
  assertCan(actor, "queues.view");
  const ids = [...new Set(organisationIds.filter((x) => /^[0-9a-f-]{36}$/i.test(x)))];
  if (!ids.length) return new Map<string, { name: string; verified: boolean }>();
  const o = schema.organisations;
  const rows = await db
    .select({
      id: o.id,
      name: sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${o.legalName})`,
      verification: o.verification,
    })
    .from(o)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, o.id))
    .where(inArray(o.id, ids));
  return new Map(rows.map((r) => [r.id, { name: r.name, verified: r.verification === "Verified" }]));
}

/** Suppliers waiting for review (627:8): the supplier_reviews the Verification desk decides. */
export async function supplierQueue(db: Executor, actor: Actor) {
  assertCan(actor, "queues.view");
  const r = schema.supplierReviews;
  const o = schema.organisations;
  return db
    .select({
      id: r.id,
      organisationId: r.organisationId,
      submittedAt: r.submittedAt,
      company: sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${o.legalName})`,
      submitter: sql<string | null>`(select u.name from core.users u where u.id = ${r.submittedBy})`,
    })
    .from(r)
    .innerJoin(o, eq(o.id, r.organisationId))
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, r.organisationId))
    .where(eq(r.status, "Submitted"))
    .orderBy(r.submittedAt);
}
