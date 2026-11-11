import { schema, type Executor } from "@h2india/db";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { getDb } from "../db";
import { changeStatus } from "../status";
import { JOIN } from "./rules";

// Join requests (365:27779): Pending · Approved · Rejected · Expired, plus Cancelled by the person who asked.
// Approving adds the membership in the same transaction as the status change.

const { joinRequests: r, memberships: m, organisations: o, users: u } = schema;

const TRANSITIONS = {
  Pending: ["Approved", "Rejected", "Expired", "Cancelled"],
} as const;

export class JoinRequestError extends Error {
  constructor(
    readonly code: "ALREADY_MEMBER" | "NOT_FOUND" | "NOT_PENDING" | "REMINDER_TOO_SOON" | "NOT_ALLOWED",
    message: string,
  ) {
    super(message);
  }
}

export interface CompanyAdmin {
  name: string;
  email: string;
}

/** Owners and admins of a company, who approve join requests. */
export async function companyAdmins(ex: Executor, organisationId: string): Promise<CompanyAdmin[]> {
  return ex
    .select({ name: u.name, email: u.email })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .where(and(eq(m.organisationId, organisationId), inArray(m.role, ["owner", "admin"])))
    .orderBy(m.createdAt);
}

export async function requestToJoin(input: {
  userId: string;
  organisationId: string;
  context?: RequestContext;
}): Promise<{ id: string; created: boolean }> {
  const db = getDb();
  const [member] = await db
    .select({ id: m.id })
    .from(m)
    .where(and(eq(m.organisationId, input.organisationId), eq(m.userId, input.userId)));
  if (member) throw new JoinRequestError("ALREADY_MEMBER", "Already in this company");
  await expireJoinRequests(db, { userId: input.userId });
  const [open] = await db
    .select({ id: r.id })
    .from(r)
    .where(and(eq(r.organisationId, input.organisationId), eq(r.userId, input.userId), eq(r.status, "Pending")));
  if (open) return { id: open.id, created: false };
  const [row] = await db
    .insert(r)
    .values({
      organisationId: input.organisationId,
      userId: input.userId,
      expiresAt: sql`now() + make_interval(days => ${JOIN.requestDays})`,
    })
    .onConflictDoNothing()
    .returning({ id: r.id });
  if (!row) {
    const [again] = await db
      .select({ id: r.id })
      .from(r)
      .where(and(eq(r.organisationId, input.organisationId), eq(r.userId, input.userId), eq(r.status, "Pending")));
    if (!again) throw new Error("join request insert returned nothing");
    return { id: again.id, created: false };
  }
  await audit(db, {
    actorId: input.userId,
    action: "join_request.create",
    resourceType: "join_request",
    resourceId: row.id,
    companyId: input.organisationId,
    context: input.context,
  });
  return { id: row.id, created: true };
}

/** Pending requests past their date become Expired. Run on read, and by the clock (step 3.8). */
export async function expireJoinRequests(db: ReturnType<typeof getDb>, scope: { userId?: string } = {}) {
  const due = await db
    .select({ id: r.id, organisationId: r.organisationId })
    .from(r)
    .where(
      and(eq(r.status, "Pending"), lt(r.expiresAt, sql`now()`), scope.userId ? eq(r.userId, scope.userId) : undefined),
    );
  for (const row of due) {
    await changeStatus(db, {
      table: r,
      entityType: "join_request",
      id: row.id,
      from: "Pending",
      to: "Expired",
      actorId: null,
      companyId: row.organisationId,
      transitions: TRANSITIONS,
    }).catch(() => undefined); // someone answered it at the same moment
  }
  return due.length;
}

export interface JoinRequestView {
  id: string;
  status: string;
  organisationId: string;
  organisationName: string;
  requestedAt: Date;
  expiresAt: Date;
  lastReminderAt: Date | null;
  reason: string | null;
  decidedByName: string | null;
  admin: CompanyAdmin | null;
  /** A reminder was sent in the last day, so "Send a reminder" waits (365:27779). */
  remindedToday: boolean;
}

/** The person's most recent join request, for the Join request screens. */
export async function latestJoinRequest(userId: string): Promise<JoinRequestView | null> {
  const db = getDb();
  await expireJoinRequests(db, { userId });
  const decider = sql<string | null>`(select ${u.name} from ${u} where ${u.id} = ${r.decidedBy})`;
  const [row] = await db
    .select({
      id: r.id,
      status: r.status,
      organisationId: r.organisationId,
      organisationName: o.legalName,
      requestedAt: r.createdAt,
      expiresAt: r.expiresAt,
      lastReminderAt: r.lastReminderAt,
      reason: r.reason,
      decidedByName: decider,
    })
    .from(r)
    .innerJoin(o, eq(o.id, r.organisationId))
    .where(and(eq(r.userId, userId), sql`${r.status} <> 'Cancelled'`))
    .orderBy(desc(r.createdAt))
    .limit(1);
  if (!row) return null;
  const [admin] = await companyAdmins(db, row.organisationId);
  const remindedToday =
    row.lastReminderAt !== null && Date.now() - row.lastReminderAt.getTime() < JOIN.reminderHours * 60 * 60 * 1000;
  return { ...row, admin: admin ?? null, remindedToday };
}

async function ownPending(db: ReturnType<typeof getDb>, userId: string, requestId: string) {
  const [row] = await db
    .select()
    .from(r)
    .where(and(eq(r.id, requestId), eq(r.userId, userId)));
  if (!row) throw new JoinRequestError("NOT_FOUND", "No such request");
  if (row.status !== "Pending") throw new JoinRequestError("NOT_PENDING", "The request is no longer pending");
  return row;
}

/** "Send a reminder": one a day (365:27779). Returns the admins to email. */
export async function remindJoinRequest(input: { userId: string; requestId: string }): Promise<CompanyAdmin[]> {
  const db = getDb();
  const row = await ownPending(db, input.userId, input.requestId);
  const updated = await db
    .update(r)
    .set({ lastReminderAt: sql`now()` })
    .where(
      and(
        eq(r.id, row.id),
        sql`(${r.lastReminderAt} IS NULL OR ${r.lastReminderAt} < now() - make_interval(hours => ${JOIN.reminderHours}))`,
      ),
    )
    .returning({ id: r.id });
  if (updated.length === 0) throw new JoinRequestError("REMINDER_TOO_SOON", "One reminder a day");
  return companyAdmins(db, row.organisationId);
}

export async function cancelJoinRequest(input: { userId: string; requestId: string; context?: RequestContext }) {
  const db = getDb();
  const row = await ownPending(db, input.userId, input.requestId);
  await changeStatus(db, {
    table: r,
    entityType: "join_request",
    id: row.id,
    from: "Pending",
    to: "Cancelled",
    actorId: input.userId,
    companyId: row.organisationId,
    transitions: TRANSITIONS,
    context: input.context,
  });
}

async function assertAdmin(db: ReturnType<typeof getDb>, adminId: string, organisationId: string) {
  const [row] = await db
    .select({ role: m.role })
    .from(m)
    .where(and(eq(m.organisationId, organisationId), eq(m.userId, adminId)));
  if (!row || (row.role !== "owner" && row.role !== "admin")) {
    throw new JoinRequestError("NOT_ALLOWED", "Only a company admin can answer join requests");
  }
}

/** A company admin approves: the person becomes a member (role refined in step 3.4). */
export async function approveJoinRequest(input: { adminId: string; requestId: string; context?: RequestContext }) {
  const db = getDb();
  const [row] = await db.select().from(r).where(eq(r.id, input.requestId));
  if (!row) throw new JoinRequestError("NOT_FOUND", "No such request");
  await assertAdmin(db, input.adminId, row.organisationId);
  await changeStatus(db, {
    table: r,
    entityType: "join_request",
    id: row.id,
    from: "Pending",
    to: "Approved",
    actorId: input.adminId,
    companyId: row.organisationId,
    transitions: TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await tx.update(r).set({ decidedBy: input.adminId, decidedAt: new Date() }).where(eq(r.id, row.id));
      await tx
        .insert(m)
        .values({ organisationId: row.organisationId, userId: row.userId, role: "member" })
        .onConflictDoNothing();
    },
  });
}

export async function rejectJoinRequest(input: {
  adminId: string;
  requestId: string;
  reason?: string;
  context?: RequestContext;
}) {
  const db = getDb();
  const [row] = await db.select().from(r).where(eq(r.id, input.requestId));
  if (!row) throw new JoinRequestError("NOT_FOUND", "No such request");
  await assertAdmin(db, input.adminId, row.organisationId);
  await changeStatus(db, {
    table: r,
    entityType: "join_request",
    id: row.id,
    from: "Pending",
    to: "Rejected",
    actorId: input.adminId,
    companyId: row.organisationId,
    reason: input.reason,
    transitions: TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await tx
        .update(r)
        .set({ decidedBy: input.adminId, decidedAt: new Date(), reason: input.reason?.trim() || null })
        .where(eq(r.id, row.id));
    },
  });
}
