import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { cancelDeadline, clockDuration, startClock, workingCalendar } from "../clocks/clocks";
import { exportMemberData } from "../members/account";
import { nextReference } from "../reference";

// Data-rights requests (660:1786), step 11.7: access (export), correction and erasure, each due 30 days after receipt.
// Erasure is a reviewed job: the dry run lists every table and file it touches and what happens there (delete, mask or
// keep), an operator with compliance.edit reviews it, then it runs. What the law requires us to keep (the audit log,
// grievances, and later invoices and ledger entries) stays, with the person's identifiers masked. The lawyer confirms
// the list (M2); until then this is the safe default.

const r = schema.dataRightsRequests;
const u = schema.users;

export class DataRightsError extends Error {}

export type Kind = "access" | "correct" | "erase";

export async function receiveRequest(
  db: Database,
  actor: Actor,
  input: { kind: Kind; email: string; details?: string },
  context?: RequestContext,
  now = new Date(),
) {
  assertCan(actor, "compliance.edit");
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new DataRightsError("Enter the person's email");
  const [person] = await db.select({ id: u.id }).from(u).where(eq(u.email, email));
  const due = (await workingCalendar(db)).add(now, await clockDuration(db, "dataRightsDue"));
  return db.transaction(async (tx) => {
    const reference = await nextReference(tx, "DRR", now);
    const [row] = await tx
      .insert(r)
      .values({
        reference,
        kind: input.kind,
        email,
        userId: person?.id ?? null,
        details: input.details?.trim() || null,
        dueAt: due,
        createdAt: now,
      })
      .returning();
    if (!row) throw new Error("insert returned nothing");
    await startClock(tx, { clock: "dataRightsDue", subjectType: "data_rights_request", subjectId: row.id, from: now });
    await audit(tx, {
      actorId: actor.userId,
      action: "data_rights.received",
      resourceType: "data_rights_request",
      resourceId: row.id,
      after: { reference, kind: input.kind },
      context,
    });
    return row;
  });
}

export async function listRequests(db: Executor, actor: Actor) {
  assertCan(actor, "compliance.view");
  return db.select().from(r).orderBy(asc(r.dueAt));
}

async function load(db: Executor, id: string) {
  const [row] = await db.select().from(r).where(eq(r.id, id));
  if (!row) throw new DataRightsError("No such request");
  return row;
}

async function finish(
  db: Database,
  actor: Actor,
  row: typeof r.$inferSelect,
  status: "Completed" | "Rejected",
  resolution: string,
  context?: RequestContext,
) {
  await db.transaction(async (tx) => {
    await tx.update(r).set({ status, resolution, completedAt: new Date() }).where(eq(r.id, row.id));
    await cancelDeadline(tx, { type: "dataRightsDue", subjectType: "data_rights_request", subjectId: row.id });
    await audit(tx, {
      actorId: actor.userId,
      action: `data_rights.${status.toLowerCase()}`,
      resourceType: "data_rights_request",
      resourceId: row.id,
      reason: resolution,
      context,
    });
  });
}

/** Access: the same export a member downloads (step 7.4), for the operator to send to the verified requester. */
export async function exportForRequest(db: Database, actor: Actor, id: string, context?: RequestContext) {
  assertCan(actor, "compliance.edit");
  const row = await load(db, id);
  if (!row.userId) throw new DataRightsError("No account uses this email: say so in the reply");
  const data = await exportMemberData(db, row.userId);
  await audit(db, {
    actorId: actor.userId,
    action: "data_rights.exported",
    resourceType: "data_rights_request",
    resourceId: id,
    context,
  });
  return data;
}

/** Correction: name and mobile on the account. */
export async function correctForRequest(
  db: Database,
  actor: Actor,
  id: string,
  change: { name?: string; mobile?: string | null },
  context?: RequestContext,
) {
  assertCan(actor, "compliance.edit");
  const row = await load(db, id);
  if (!row.userId) throw new DataRightsError("No account uses this email");
  const [before] = await db.select({ name: u.name, mobile: u.mobile }).from(u).where(eq(u.id, row.userId));
  await db
    .update(u)
    .set({
      ...(change.name !== undefined ? { name: change.name.trim() } : {}),
      ...(change.mobile !== undefined ? { mobile: change.mobile, mobileVerifiedAt: null } : {}),
    })
    .where(eq(u.id, row.userId));
  await audit(db, {
    actorId: actor.userId,
    action: "data_rights.corrected",
    resourceType: "user",
    resourceId: row.userId,
    before,
    after: change,
    context,
  });
  await finish(db, actor, row, "Completed", "Corrected as asked", context);
}

// ------------------------------------------------------------------------------------------------ erasure

export interface PlanLine {
  table: string;
  action: "delete" | "mask" | "keep";
  rows: number;
  why: string;
}

interface Step {
  table: string;
  action: PlanLine["action"];
  why: string;
  target: PgTable;
  where: (userId: string, email: string) => SQL | undefined;
  mask?: (userId: string) => Record<string, unknown>;
}

const MASKED = (userId: string) => `erased-${userId.slice(0, 8)}@erased.invalid`;

/** Every table that holds this person's data, and what erasure does there. */
const STEPS: Step[] = [
  {
    table: "sessions",
    action: "delete",
    why: "Signed-in devices",
    target: schema.sessions,
    where: (id) => eq(schema.sessions.userId, id),
  },
  {
    table: "accounts",
    action: "delete",
    why: "Sign-in methods",
    target: schema.accounts,
    where: (id) => eq(schema.accounts.userId, id),
  },
  {
    table: "passkeys",
    action: "delete",
    why: "Passkeys",
    target: schema.passkeys,
    where: (id) => eq(schema.passkeys.userId, id),
  },
  {
    table: "member_profiles",
    action: "delete",
    why: "Member profile",
    target: schema.memberProfiles,
    where: (id) => eq(schema.memberProfiles.userId, id),
  },
  {
    table: "follows",
    action: "delete",
    why: "Follows",
    target: schema.follows,
    where: (id) => eq(schema.follows.userId, id),
  },
  {
    table: "alerts",
    action: "delete",
    why: "Alerts",
    target: schema.alerts,
    where: (id) => eq(schema.alerts.userId, id),
  },
  {
    table: "saved_items",
    action: "delete",
    why: "Saved items",
    target: schema.savedItems,
    where: (id) => eq(schema.savedItems.userId, id),
  },
  {
    table: "learning_progress",
    action: "delete",
    why: "Hydrogen 101 progress",
    target: schema.learningProgress,
    where: (id) => eq(schema.learningProgress.userId, id),
  },
  {
    table: "job_applications",
    action: "delete",
    why: "Job applications",
    target: schema.jobApplications,
    where: (id) => eq(schema.jobApplications.userId, id),
  },
  {
    table: "queue_saved_views",
    action: "delete",
    why: "Saved queue views (operators)",
    target: schema.queueSavedViews,
    where: (id) => eq(schema.queueSavedViews.userId, id),
  },
  {
    table: "notifications",
    action: "delete",
    why: "In-app notifications",
    target: schema.notifications,
    where: (id) => eq(schema.notifications.userId, id),
  },
  {
    table: "notification_preferences",
    action: "delete",
    why: "Notification choices",
    target: schema.notificationPreferences,
    where: (id) => eq(schema.notificationPreferences.userId, id),
  },
  {
    table: "notification_settings",
    action: "delete",
    why: "Quiet hours",
    target: schema.notificationSettings,
    where: (id) => eq(schema.notificationSettings.userId, id),
  },
  {
    table: "message_reads",
    action: "delete",
    why: "Read markers",
    target: schema.messageReads,
    where: (id) => eq(schema.messageReads.userId, id),
  },
  {
    table: "join_requests",
    action: "delete",
    why: "Requests to join companies",
    target: schema.joinRequests,
    where: (id) => eq(schema.joinRequests.userId, id),
  },
  {
    table: "newsletter_subscribers",
    action: "delete",
    why: "Newsletter subscription",
    target: schema.newsletterSubscribers,
    where: (_id, email) => eq(schema.newsletterSubscribers.email, email),
  },
  {
    table: "memberships",
    action: "delete",
    why: "Company memberships",
    target: schema.memberships,
    where: (id) => eq(schema.memberships.userId, id),
  },
  {
    table: "webinar_registrations",
    action: "mask",
    why: "Seat counts stay; name, email and mobile go",
    target: schema.webinarRegistrations,
    where: (id, email) =>
      sql`(${schema.webinarRegistrations.userId} = ${id} or ${schema.webinarRegistrations.email} = ${email})`,
    mask: (id) => ({
      name: "Erased person",
      email: MASKED(id),
      mobile: null,
      organisation: null,
      role: null,
      userId: null,
    }),
  },
  {
    table: "notification_deliveries",
    action: "mask",
    why: "The send log stays for audit; the address and content go",
    target: schema.notificationDeliveries,
    where: (id, email) =>
      sql`(${schema.notificationDeliveries.userId} = ${id} or ${schema.notificationDeliveries.recipient} = ${email})`,
    mask: (id) => ({ recipient: MASKED(id), payload: null, userId: null }),
  },
  {
    table: "grievances",
    action: "mask",
    why: "Kept by law (grievance records); name, email and mobile masked",
    target: schema.grievances,
    where: (id, email) => sql`(${schema.grievances.userId} = ${id} or ${schema.grievances.email} = ${email})`,
    mask: (id) => ({ name: "Erased person", email: MASKED(id), mobile: null }),
  },
  {
    table: "users",
    action: "mask",
    why: "The account row stays so company records and the audit log still point somewhere; every personal field goes",
    target: u,
    where: (id) => eq(u.id, id),
    mask: (id) => ({
      name: "Erased person",
      email: MASKED(id),
      mobile: null,
      mobileVerifiedAt: null,
      image: null,
      jobRole: null,
      emailVerified: false,
    }),
  },
  {
    table: "audit_log",
    action: "keep",
    why: "Kept by law; points to the masked account",
    target: schema.auditLog,
    where: (id) => sql`(${schema.auditLog.actorId} = ${id} or ${schema.auditLog.resourceId} = ${id})`,
  },
  {
    table: "messages",
    action: "keep",
    why: "The other company's conversation; shown as from Erased person",
    target: schema.messages,
    where: (id) => eq(schema.messages.authorId, id),
  },
  {
    table: "order_ratings",
    action: "keep",
    why: "Part of the order record; the rater points to the masked account",
    target: schema.orderRatings,
    where: (id) => eq(schema.orderRatings.ratedBy, id),
  },
  {
    table: "suspension_appeals",
    action: "keep",
    why: "The company's appeal record; the sender points to the masked account",
    target: schema.suspensionAppeals,
    where: (id) => eq(schema.suspensionAppeals.sentBy, id),
  },
  {
    table: "carts",
    action: "delete",
    why: "The person's own cart (step 10.2)",
    target: schema.carts,
    where: (id) => eq(schema.carts.userId, id),
  },
  {
    table: "orders",
    action: "keep",
    why: "Financial records are kept by law (playbook Section 8); placed by points to the masked account",
    target: schema.orders,
    where: (id) => eq(schema.orders.placedBy, id),
  },
];

/** Files the person uploaded for themselves (profile photos) are deleted; company files stay with the company. */
const PERSONAL_FILE_KINDS = ["profile_photo"];

/** The dry run (660:1786 Erase): every table and file affected, before anything is deleted. Stored on the request. */
export async function erasurePlan(db: Database, actor: Actor, id: string, context?: RequestContext) {
  assertCan(actor, "compliance.edit");
  const row = await load(db, id);
  if (row.kind !== "erase") throw new DataRightsError("This request isn't for erasure");
  if (!row.userId) throw new DataRightsError("No account uses this email");
  const userId = row.userId;
  const lines: PlanLine[] = [];
  for (const s of STEPS) {
    const [c] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.target)
      .where(s.where(userId, row.email));
    lines.push({ table: s.table, action: s.action, rows: c?.n ?? 0, why: s.why });
  }
  const [files] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.files)
    .where(
      and(
        eq(schema.files.uploadedBy, userId),
        inArray(schema.files.kind, PERSONAL_FILE_KINDS),
        sql`${schema.files.deletedAt} is null`,
      ),
    );
  lines.push({ table: "files", action: "delete", rows: files?.n ?? 0, why: "Profile photos" });
  // A company can't be left without an admin.
  const sole = await db.execute<{ legal_name: string }>(sql`
    select o.legal_name from core.memberships m join core.organisations o on o.id = m.organisation_id
    where m.user_id = ${userId} and m.role = 'Admin'
      and not exists (select 1 from core.memberships x where x.organisation_id = m.organisation_id and x.role = 'Admin' and x.user_id <> ${userId})`);
  const blockers = sole.rows.map((x) => `Only admin of ${x.legal_name}: make someone else an admin first`);
  const plan = { lines, blockers, at: new Date().toISOString() };
  await db.update(r).set({ plan, planBy: actor.userId, status: "In progress" }).where(eq(r.id, id));
  await audit(db, {
    actorId: actor.userId,
    action: "data_rights.dry_run",
    resourceType: "data_rights_request",
    resourceId: id,
    after: { tables: lines.length, blockers: blockers.length },
    context,
  });
  return plan;
}

/** Run the reviewed erasure. Needs a dry run with no blockers, made in the last hour. */
export async function eraseForRequest(
  db: Database,
  actor: Actor,
  id: string,
  context?: RequestContext,
  now = new Date(),
) {
  assertCan(actor, "compliance.edit");
  const row = await load(db, id);
  const plan = row.plan as { blockers?: string[]; at?: string } | null;
  if (!plan?.at || now.getTime() - new Date(plan.at).getTime() > 3_600_000)
    throw new DataRightsError("Run the dry run first");
  if (plan.blockers?.length) throw new DataRightsError(plan.blockers[0] ?? "Fix the blockers first");
  if (!row.userId) throw new DataRightsError("No account uses this email");
  const userId = row.userId;
  await db.transaction(async (tx) => {
    for (const s of STEPS) {
      if (s.action === "delete") await tx.delete(s.target).where(s.where(userId, row.email));
      if (s.action === "mask" && s.mask)
        await tx.update(s.target).set(s.mask(userId)).where(s.where(userId, row.email));
    }
    await tx
      .update(schema.files)
      .set({ deletedAt: now })
      .where(and(eq(schema.files.uploadedBy, userId), inArray(schema.files.kind, PERSONAL_FILE_KINDS)));
    await tx
      .update(r)
      .set({ email: MASKED(userId) })
      .where(eq(r.id, id));
  });
  await finish(db, actor, { ...row, email: MASKED(userId) }, "Completed", "Erased as reviewed in the dry run", context);
}

export async function rejectRequest(db: Database, actor: Actor, id: string, reason: string, context?: RequestContext) {
  assertCan(actor, "compliance.edit");
  if (!reason.trim()) throw new DataRightsError("Give a reason");
  await finish(db, actor, await load(db, id), "Rejected", reason.trim(), context);
}

/** Grievances for the Compliance screen (660:281), oldest open first. Operators with compliance.view. */
export async function listGrievances(db: Executor, actor: Actor, opts: { status?: string } = {}) {
  assertCan(actor, "compliance.view");
  const g = schema.grievances;
  return db
    .select()
    .from(g)
    .where(opts.status ? eq(g.status, opts.status) : undefined)
    .orderBy(asc(g.createdAt))
    .limit(300);
}

export async function grievanceDetail(db: Executor, actor: Actor, id: string) {
  assertCan(actor, "compliance.view");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(schema.grievances).where(eq(schema.grievances.id, id));
  if (!row) return null;
  const history = await db
    .select()
    .from(schema.statusHistory)
    .where(and(eq(schema.statusHistory.entityType, "grievance"), eq(schema.statusHistory.entityId, id)))
    .orderBy(asc(schema.statusHistory.at));
  return { grievance: row, history };
}

export async function requestDetail(db: Executor, actor: Actor, id: string) {
  assertCan(actor, "compliance.view");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(r).where(eq(r.id, id));
  return row ?? null;
}
