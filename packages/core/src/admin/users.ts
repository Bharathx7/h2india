import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { hashToken } from "../companies/drafts";
import { queueProductsOf } from "../search/products";

// Users (651:8, 651:1042), Suspend user (653:568) and View as user (657:328, 657:486), step 11.4. Operators with
// users.view find anyone; users.edit suspends (with a reason). Suspension ends the person's sessions and refuses
// sign-in; a suspended company's listings leave the marketplace and search. View-as is read-only, short and audited.

const u = schema.users;
const m = schema.memberships;
const o = schema.organisations;

export class UserAdminError extends Error {}

/** How long a view-as lasts. */
export const VIEW_AS_MINUTES = 15;

export async function listUsers(
  db: Executor,
  actor: Actor,
  opts: {
    q?: string;
    type?: "buyer" | "supplier" | "member" | "operator";
    status?: "active" | "suspended";
    limit?: number;
    offset?: number;
  } = {},
) {
  assertCan(actor, "users.view");
  const conds = [];
  if (opts.q) {
    const like = `%${opts.q}%`;
    // Name, email, mobile, or a company they belong to by name or GSTIN (651:8 "Search name, email, mobile or GSTIN").
    conds.push(
      or(
        ilike(u.name, like),
        ilike(u.email, like),
        ilike(u.mobile, like),
        sql`exists (select 1 from core.memberships x join core.organisations y on y.id = x.organisation_id left join core.organisation_gstins g on g.organisation_id = y.id where x.user_id = ${u.id} and (y.legal_name ilike ${like} or g.gstin ilike ${like}))`,
      ),
    );
  }
  if (opts.status === "suspended") conds.push(sql`${u.suspendedAt} is not null`);
  if (opts.status === "active") conds.push(isNull(u.suspendedAt));
  if (opts.type === "operator") conds.push(sql`exists (select 1 from core.operator_roles r where r.user_id = ${u.id})`);
  if (opts.type === "member") conds.push(sql`not exists (select 1 from core.memberships x where x.user_id = ${u.id})`);
  if (opts.type === "buyer" || opts.type === "supplier")
    conds.push(
      sql`exists (select 1 from core.memberships x join core.organisations y on y.id = x.organisation_id where x.user_id = ${u.id} and y.kind in (${opts.type}, 'both'))`,
    );
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({
        id: u.id,
        name: u.name,
        email: u.email,
        suspendedAt: u.suspendedAt,
        createdAt: u.createdAt,
        companies: sql<
          string | null
        >`(select string_agg(y.legal_name || ' · ' || x.role, ', ') from core.memberships x join core.organisations y on y.id = x.organisation_id where x.user_id = core.users.id)`,
        operator: sql<
          string | null
        >`(select string_agg(ro.name, ', ') from core.operator_roles r join core.roles ro on ro.id = r.role_id where r.user_id = core.users.id)`,
        lastActive: sql<Date | null>`(select max(s.updated_at) from core.sessions s where s.user_id = core.users.id)`,
        /** The first company (by joining date) with the person's role there, for the Organisation and role column. */
        organisation: sql<
          string | null
        >`(select y.legal_name from core.memberships x join core.organisations y on y.id = x.organisation_id where x.user_id = core.users.id order by x.created_at limit 1)`,
        role: sql<
          string | null
        >`(select x.role from core.memberships x where x.user_id = core.users.id order by x.created_at limit 1)`,
        kind: sql<
          string | null
        >`(select y.kind from core.memberships x join core.organisations y on y.id = x.organisation_id where x.user_id = core.users.id order by x.created_at limit 1)`,
        orgSuspended: sql<boolean>`exists (select 1 from core.memberships x join core.organisations y on y.id = x.organisation_id where x.user_id = core.users.id and y.suspended_at is not null)`,
      })
      .from(u)
      .where(where)
      .orderBy(desc(u.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(u)
      .where(where),
  ]);
  return { rows, total: total[0]?.n ?? 0 };
}

export async function userDetail(db: Executor, actor: Actor, userId: string) {
  assertCan(actor, "users.view");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const [person] = await db.select().from(u).where(eq(u.id, userId));
  if (!person) return null;
  const [companies, roles, sessions, activity] = await Promise.all([
    db
      .select({
        id: o.id,
        name: o.legalName,
        kind: o.kind,
        role: m.role,
        since: m.createdAt,
        verification: o.verification,
        suspendedAt: o.suspendedAt,
        city: sql<string | null>`(select p.city from core.company_profiles p where p.organisation_id = ${o.id})`,
      })
      .from(m)
      .innerJoin(o, eq(o.id, m.organisationId))
      .where(eq(m.userId, userId)),
    db
      .select({ name: schema.roles.name })
      .from(schema.operatorRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.operatorRoles.roleId))
      .where(eq(schema.operatorRoles.userId, userId)),
    db
      .select({ userAgent: schema.sessions.userAgent, updatedAt: schema.sessions.updatedAt })
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, new Date())))
      .orderBy(desc(schema.sessions.updatedAt)),
    db
      .select({ at: schema.auditLog.at, action: schema.auditLog.action, resourceType: schema.auditLog.resourceType })
      .from(schema.auditLog)
      .where(or(eq(schema.auditLog.actorId, userId), eq(schema.auditLog.resourceId, userId)))
      .orderBy(desc(schema.auditLog.at))
      .limit(20),
  ]);
  const { suspendReason, ...rest } = person;
  return {
    person: { ...rest, suspendReason },
    companies,
    operatorRoles: roles.map((r) => r.name),
    sessions,
    activity,
  };
}

/** Names and their role or company, for the Actor column of the Audit log (656:872). Unknown ids are left out. */
export async function actorLabels(db: Executor, actor: Actor, ids: string[]) {
  assertCan(actor, "users.view");
  const unique = [...new Set(ids)].filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (!unique.length) return new Map<string, { name: string; detail: string }>();
  const rows = await db
    .select({
      id: u.id,
      name: u.name,
      email: u.email,
      operator: sql<
        string | null
      >`(select string_agg(ro.name, ', ') from core.operator_roles r join core.roles ro on ro.id = r.role_id where r.user_id = core.users.id)`,
      company: sql<
        string | null
      >`(select y.legal_name || ' · ' || x.role from core.memberships x join core.organisations y on y.id = x.organisation_id where x.user_id = core.users.id order by x.created_at limit 1)`,
    })
    .from(u)
    .where(inArray(u.id, unique));
  return new Map(rows.map((r) => [r.id, { name: r.name || r.email, detail: r.operator ?? r.company ?? "Member" }]));
}

/** Suspend a person (653:568): sessions end at once and sign-in is refused with the designed message. */
export async function suspendUser(
  db: Database,
  actor: Actor,
  userId: string,
  reason: string,
  context?: RequestContext,
) {
  assertCan(actor, "users.edit");
  if (!reason.trim()) throw new UserAdminError("Give a reason");
  if (userId === actor.userId) throw new UserAdminError("You can't suspend yourself");
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(u)
      .set({ suspendedAt: new Date(), suspendReason: reason.trim() })
      .where(and(eq(u.id, userId), isNull(u.suspendedAt)))
      .returning({ id: u.id });
    if (!row) throw new UserAdminError("This person is already suspended");
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await audit(tx, {
      actorId: actor.userId,
      action: "user.suspended",
      resourceType: "user",
      resourceId: userId,
      reason: reason.trim(),
      after: { suspended: true },
      context,
    });
  });
}

export async function liftSuspension(
  db: Database,
  actor: Actor,
  userId: string,
  reason: string,
  context?: RequestContext,
) {
  assertCan(actor, "users.edit");
  if (!reason.trim()) throw new UserAdminError("Give a reason");
  await db.transaction(async (tx) => {
    await tx.update(u).set({ suspendedAt: null, suspendReason: null }).where(eq(u.id, userId));
    await audit(tx, {
      actorId: actor.userId,
      action: "user.unsuspended",
      resourceType: "user",
      resourceId: userId,
      reason: reason.trim(),
      after: { suspended: false },
      context,
    });
  });
}

/** Suspend a company (G10 default): its listings leave the marketplace and search; appeals go to email. */
export async function suspendCompany(
  db: Database,
  actor: Actor,
  organisationId: string,
  reason: string | null,
  context?: RequestContext,
) {
  assertCan(actor, "users.edit");
  const suspend = reason !== null;
  if (suspend && !reason.trim()) throw new UserAdminError("Give a reason");
  await db.transaction(async (tx) => {
    await tx
      .update(o)
      .set(
        suspend
          ? { suspendedAt: new Date(), suspendReason: reason.trim() }
          : { suspendedAt: null, suspendReason: null },
      )
      .where(eq(o.id, organisationId));
    await queueProductsOf(tx, { organisationIds: [organisationId] });
    await audit(tx, {
      actorId: actor.userId,
      action: suspend ? "company.suspended" : "company.unsuspended",
      resourceType: "organisation",
      resourceId: organisationId,
      companyId: organisationId,
      reason: reason?.trim() ?? null,
      context,
    });
  });
}

/** Whether a person is suspended (sign-in checks it). */
export async function isSuspended(db: Executor, email: string) {
  const [row] = await db.select({ at: u.suspendedAt }).from(u).where(eq(u.email, email.toLowerCase()));
  return Boolean(row?.at);
}

/** Start viewing as a person (657:328): a reason is required; returns the token for the read-only cookie. */
export async function startViewAs(
  db: Database,
  actor: Actor,
  userId: string,
  reason: string,
  context?: RequestContext,
  now = new Date(),
) {
  assertCan(actor, "users.view");
  if (!actor.userId) throw new UserAdminError("Sign in again");
  if (reason.trim().length < 10) throw new UserAdminError("Say why you need to view as this person");
  if (userId === actor.userId) throw new UserAdminError("That's you");
  const [target] = await db.select({ id: u.id }).from(u).where(eq(u.id, userId));
  if (!target) throw new UserAdminError("No such person");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + VIEW_AS_MINUTES * 60_000);
  const operatorId = actor.userId;
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.viewAsGrants)
      .values({ operatorId, userId, reason: reason.trim(), tokenHash: hashToken(token), expiresAt });
    await audit(tx, {
      actorId: operatorId,
      action: "view_as.started",
      resourceType: "user",
      resourceId: userId,
      reason: reason.trim(),
      after: { until: expiresAt.toISOString() },
      context,
    });
  });
  return { token, expiresAt };
}

/** The person being viewed, if this token is live and belongs to this operator; null otherwise. */
export async function viewAsGrant(db: Executor, token: string, operatorId: string, now = new Date()) {
  const g = schema.viewAsGrants;
  const [row] = await db
    .select({ grant: g, name: u.name, email: u.email })
    .from(g)
    .innerJoin(u, eq(u.id, g.userId))
    .where(
      and(eq(g.tokenHash, hashToken(token)), eq(g.operatorId, operatorId), isNull(g.endedAt), gt(g.expiresAt, now)),
    );
  return row ?? null;
}

export async function endViewAs(db: Database, token: string, operatorId: string, context?: RequestContext) {
  const g = schema.viewAsGrants;
  const [row] = await db
    .update(g)
    .set({ endedAt: new Date() })
    .where(and(eq(g.tokenHash, hashToken(token)), eq(g.operatorId, operatorId), isNull(g.endedAt)))
    .returning();
  if (row)
    await audit(db, {
      actorId: operatorId,
      action: "view_as.ended",
      resourceType: "user",
      resourceId: row.userId,
      context,
    });
}

/** The operator roles and their permissions (656:8), for the Roles screen. */
export async function operatorRoleGrid(db: Executor, actor: Actor) {
  assertCan(actor, "users.view");
  const roles = await db.select().from(schema.roles).where(eq(schema.roles.scope, "operator"));
  const perms = roles.length
    ? await db
        .select()
        .from(schema.rolePermissions)
        .where(
          inArray(
            schema.rolePermissions.roleId,
            roles.map((r) => r.id),
          ),
        )
    : [];
  const people = await db
    .select({ roleId: schema.operatorRoles.roleId, userId: u.id, name: u.name, email: u.email })
    .from(schema.operatorRoles)
    .innerJoin(u, eq(u.id, schema.operatorRoles.userId));
  return roles.map((r) => ({
    ...r,
    permissions: perms.filter((p) => p.roleId === r.id).map((p) => p.permissionKey),
    people: people.filter((p) => p.roleId === r.id),
  }));
}

/** Find a person by email (Operator roles: add someone to a role). */
export async function userIdByEmail(db: Executor, actor: Actor, email: string) {
  assertCan(actor, "users.view");
  const [row] = await db.select({ id: u.id }).from(u).where(eq(u.email, email.trim().toLowerCase()));
  return row?.id ?? null;
}
