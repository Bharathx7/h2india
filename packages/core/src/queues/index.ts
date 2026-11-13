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

// ------------------------------------------------------------------------------------------------ field comments

const fc = schema.queueFieldComments;
const QUEUE_KEYS: readonly string[] = QUEUES.map((q) => q.key);

/**
 * A moderator's comment on one field (633:8, "added a field comment"): internal, never sent to the submitter. Only
 * while the item is still waiting for a decision. Audit-logged.
 */
export async function addFieldComment(
  db: Database,
  actor: Actor,
  input: { queue: QueueKey; subjectId: string; field: string; note: string },
  context?: RequestContext,
) {
  assertCan(actor, "queues.edit");
  const userId = actor.userId;
  if (!userId) throw new QueueError("Sign in again");
  if (!QUEUE_KEYS.includes(input.queue)) throw new QueueError("No such queue");
  const note = input.note.trim();
  const field = input.field.trim().slice(0, 80);
  if (!note) throw new QueueError("Write the comment");
  if (note.length > 500) throw new QueueError("Keep the comment under 500 characters");
  if (!field) throw new QueueError("Choose a field");
  const [claim] = await db
    .select({ decidedAt: c.decidedAt })
    .from(c)
    .where(and(eq(c.queue, input.queue), eq(c.subjectId, input.subjectId)));
  if (claim?.decidedAt) throw new QueueError("This item has been decided");
  await db.transaction(async (tx) => {
    await tx.insert(fc).values({ queue: input.queue, subjectId: input.subjectId, field, note, authorId: userId });
    await audit(tx, {
      actorId: userId,
      action: "queue.field_comment",
      resourceType: input.queue,
      resourceId: input.subjectId,
      after: { field, note },
      context,
    });
  });
}

/** The comments on an item, oldest first, with who wrote them. */
export async function fieldComments(db: Executor, queue: QueueKey, subjectId: string) {
  return db
    .select({ id: fc.id, field: fc.field, note: fc.note, at: fc.at, author: schema.users.name })
    .from(fc)
    .innerJoin(schema.users, eq(schema.users.id, fc.authorId))
    .where(and(eq(fc.queue, queue), eq(fc.subjectId, subjectId)))
    .orderBy(fc.at);
}

// ------------------------------------------------------------------------------------------------ saved views

const sv = schema.queueSavedViews;
export const SAVED_VIEWS_MAX = 10;

/** Save view: the operator's own named view of a queue (the view and the search). Saving a name again replaces it. */
export async function saveQueueView(
  db: Database,
  actor: Actor,
  input: { queue: QueueKey; name: string; view: string; search: string },
) {
  assertCan(actor, "queues.view");
  const userId = actor.userId;
  if (!userId) throw new QueueError("Sign in again");
  if (!QUEUE_KEYS.includes(input.queue)) throw new QueueError("No such queue");
  const name = input.name.trim().slice(0, 40);
  if (!name) throw new QueueError("Name the view");
  const mine = await queueViews(db, userId, input.queue);
  if (mine.length >= SAVED_VIEWS_MAX && !mine.some((v) => v.name === name))
    throw new QueueError(`Keep up to ${String(SAVED_VIEWS_MAX)} views; delete one first`);
  const values = { view: input.view.slice(0, 20), search: input.search.trim().slice(0, 100) };
  await db
    .insert(sv)
    .values({ userId, queue: input.queue, name, ...values })
    .onConflictDoUpdate({ target: [sv.userId, sv.queue, sv.name], set: values });
}

export async function queueViews(db: Executor, userId: string, queue: QueueKey) {
  return db
    .select({ id: sv.id, name: sv.name, view: sv.view, search: sv.search })
    .from(sv)
    .where(and(eq(sv.userId, userId), eq(sv.queue, queue)))
    .orderBy(sv.createdAt);
}

/** Delete one of the operator's own views. */
export async function deleteQueueView(db: Database, actor: Actor, id: string) {
  const userId = actor.userId;
  if (!userId) throw new QueueError("Sign in again");
  await db.delete(sv).where(and(eq(sv.id, id), eq(sv.userId, userId)));
}
