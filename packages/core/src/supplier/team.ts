import { createHash, randomBytes } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import { schema, type Database, type Executor } from "@h2india/db";
import { renderInvitation } from "@h2india/emails";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { COMPANY_PERMISSIONS, type CompanyPermission } from "../authz/catalogue";
import { applyChanges, defaultPermissions, kindOf, roleChangesFor } from "../authz/company-roles";
import { ownPermissions, storedAccess, type AccessChoice } from "../authz/member-access";
import { looksLikeEmail } from "../sign-in/rules";
import { inScope, type Scope } from "../authz/scope";
import { clockDuration, workingCalendar } from "../clocks/clocks";
import { deliverEmail } from "../notify/channels";
import { defineSetting, getSetting } from "../settings";
import { formatIstDate } from "../time";
import { z } from "zod";

// Team and permissions (592:371; phones 594:564; Dialog Remove team member 685:318; Invitation 673:155), step 8.7.
// Admins invite colleagues with a role, answer join requests, change roles and remove people. Roles and what they
// can do are data (authz catalogue). An invitation is accepted only by the person whose email it was sent to.

const m = schema.memberships;
const inv = schema.invitations;
const u = schema.users;

export class TeamError extends Error {}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** The supplier (or buyer) roles with what each can do, as drawn on 592:371 ("What each role can do"). */
export async function companyRoles(db: Executor, organisationId: string) {
  const [org] = await db
    .select({ kind: schema.organisations.kind })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  const scope = org?.kind === "supplier" ? "supplier" : "buyer";
  const rows = await db
    .select({ name: schema.roles.name, description: schema.roles.description })
    .from(schema.roles)
    .where(eq(schema.roles.scope, scope));
  // As drawn: the widest role first.
  const order = ["Admin", "Approver", "Requester", "Sales", "Catalogue", "Finance", "Viewer"];
  return rows.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
}

/** Members (with last active), open invitations and waiting join requests. Company-scoped. */
export async function teamView(db: Executor, scope: Scope, organisationId: string, now: Date = new Date()) {
  const members = await db
    .select({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: m.role,
      own: m.permissions,
      orderLimitPaise: m.orderLimitPaise,
      lastActive: sql<Date | null>`(select max(s.updated_at) from core.sessions s where s.user_id = ${u.id})`,
    })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .where(and(inScope(scope, m.organisationId), eq(m.organisationId, organisationId)))
    .orderBy(u.name);
  // What each person can do, as loadActor() works it out: Admin everything, their own ticks, or their role's
  // defaults with the company's changes (founder QC, 17 Nov 2026: Team shows and edits each member's access).
  const [org] = await db
    .select({ kind: schema.organisations.kind })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  const kind = kindOf(org?.kind);
  const changes = await roleChangesFor(
    db,
    members.map((x) => ({ organisationId, role: x.role })),
  );
  const accessOf = (role: string, own: string[] | null) =>
    [
      ...(own && role !== "Admin"
        ? ownPermissions(kind, own)
        : applyChanges(defaultPermissions(kind, role), changes.get(`${organisationId}|${role}`) ?? [])),
    ] as CompanyPermission[];
  const invitations = await db
    .select({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      own: inv.permissions,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })
    .from(inv)
    .where(
      and(
        inScope(scope, inv.organisationId),
        eq(inv.organisationId, organisationId),
        isNull(inv.acceptedAt),
        isNull(inv.revokedAt),
        gt(inv.expiresAt, now),
      ),
    )
    .orderBy(desc(inv.createdAt));
  const jr = schema.joinRequests;
  const requests = await db
    .select({ id: jr.id, name: u.name, email: u.email, createdAt: jr.createdAt })
    .from(jr)
    .innerJoin(u, eq(u.id, jr.userId))
    .where(and(inScope(scope, jr.organisationId), eq(jr.organisationId, organisationId), eq(jr.status, "Pending")))
    .orderBy(jr.createdAt);
  return {
    kind,
    members: members.map((x) => ({ ...x, admin: x.role === "Admin", access: accessOf(x.role, x.own) })),
    invitations: invitations.map((x) => ({ ...x, admin: x.role === "Admin", access: accessOf(x.role, x.own) })),
    requests,
  };
}

/** Invite member: an email to the address with a link that works for 14 days (673:155). */
export async function inviteMember(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { email: string; role?: string; access?: AccessChoice; context?: RequestContext },
  now: Date = new Date(),
): Promise<{ id: string; token: string }> {
  assertCan(actor, "team.manage", { organisationId });
  // Founder QC (17 Nov 2026): the admin ticks what the person may do (presets tick boxes); a role name still works.
  let role = input.role ?? "";
  let permissions: string[] | null = null;
  if (input.access) {
    const [org] = await db
      .select({ kind: schema.organisations.kind })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, organisationId));
    ({ role, permissions } = storedAccess(kindOf(org?.kind), input.access));
  }
  return sendInvitation(
    db,
    {
      organisationId,
      email: input.email,
      role,
      permissions,
      invitedBy: actor.userId,
      inviterRole: actor.companies.get(organisationId)?.role ?? "Admin",
      context: input.context,
    },
    now,
  );
}

/**
 * Records an invitation and emails it (Invitation, 548:8). Callers check who may invite: a company's team.manage
 * (inviteMember) or an operator adding a company for its owner (addSupplierByOperator, admin QC).
 */
export async function sendInvitation(
  db: Database,
  input: {
    organisationId: string;
    email: string;
    role: string;
    /** The member's own access (storedAccess()); null keeps the role's defaults. */
    permissions?: string[] | null;
    invitedBy: string | null;
    /** How the email names the inviter's role, for example "Admin" or "H2 Economy team". */
    inviterRole: string;
    context?: RequestContext;
  },
  now: Date = new Date(),
): Promise<{ id: string; token: string }> {
  const organisationId = input.organisationId;
  const email = input.email.trim().toLowerCase();
  if (!looksLikeEmail(email)) throw new TeamError("Enter a full email address");
  const roles = await companyRoles(db, organisationId);
  const own = input.permissions ?? null;
  const role =
    roles.find((r) => r.name === input.role) ??
    // Ticks that match no preset (founder QC, 17 Nov 2026): the email lists what they can do.
    (input.role === "Custom" && own?.length
      ? {
          name: "Custom",
          description: `Can: ${own.map((p) => (COMPANY_PERMISSIONS as Record<string, string | undefined>)[p] ?? p).join(", ")}.`,
        }
      : null);
  if (!role) throw new TeamError("Choose what they can do");
  const already = await db
    .select({ id: m.userId })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .where(and(eq(m.organisationId, organisationId), eq(u.email, email)));
  if (already.length) throw new TeamError("This person is already in the team");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = (await workingCalendar(db)).add(now, await clockDuration(db, "teamInvitation"));
  const [row] = await db
    .insert(inv)
    .values({
      organisationId,
      email,
      role: role.name,
      permissions: role.name === "Admin" ? null : own,
      tokenHash: hash(token),
      invitedBy: input.invitedBy,
      expiresAt,
    })
    .returning({ id: inv.id });
  if (!row) throw new Error("invitation not saved");
  await audit(db, {
    actorId: input.invitedBy,
    action: "team.invited",
    resourceType: "invitation",
    resourceId: row.id,
    companyId: organisationId,
    after: { email, role: role.name, permissions: own },
    context: input.context,
  });
  const [inviter] = await db
    .select({ name: u.name })
    .from(u)
    .where(eq(u.id, input.invitedBy ?? ""));
  const [org] = await db
    .select({
      legal: schema.organisations.legalName,
      kind: schema.organisations.kind,
      verification: schema.organisations.verification,
      trade: schema.companyProfiles.tradeName,
      city: schema.companyProfiles.city,
    })
    .from(schema.organisations)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
    .where(eq(schema.organisations.id, organisationId));
  const app = parseServerEnv().APP_URL;
  await deliverEmail({
    template: "email.invitation",
    event: "team.invited",
    userId: null,
    to: email,
    mail: await renderInvitation(app, {
      name: "",
      email,
      inviter: inviter?.name ?? "A colleague",
      inviterRole: input.inviterRole,
      company: org?.trade ?? org?.legal ?? "",
      companyLine: [org?.legal, org?.verification === "Verified" ? "verified supplier" : null, org?.city]
        .filter(Boolean)
        .join(" · "),
      role: role.name,
      roleText: role.description,
      expires: formatIstDate(expiresAt),
      acceptUrl: `${app}/invite/${token}`,
      workspace: org?.kind === "supplier" ? "supplier" : "buyer",
    }),
  });
  return { id: row.id, token };
}

export async function revokeInvitation(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
) {
  assertCan(actor, "team.manage", { organisationId });
  const done = await db
    .update(inv)
    .set({ revokedAt: new Date() })
    .where(and(eq(inv.id, id), eq(inv.organisationId, organisationId), isNull(inv.acceptedAt)))
    .returning({ id: inv.id });
  if (!done.length) throw new TeamError("This invitation has already been used");
  await audit(db, {
    actorId: actor.userId,
    action: "team.invitation.revoked",
    resourceType: "invitation",
    resourceId: id,
    companyId: organisationId,
    context,
  });
}

/** How soon the same invitation may be sent again (founder, 19 Nov 2026: Resend invitation on Team). */
export const INVITATION_RESEND = defineSetting<{ minutes: number }>({
  key: "team.invitationResendMinutes",
  description: "Team: minutes before an invitation can be sent again (Resend invitation)",
  schema: z.object({ minutes: z.number().int().min(1).max(1440) }),
  fallback: { minutes: 10 },
});

/**
 * Resend invitation (founder, 19 Nov 2026): a fresh link with a fresh expiry, the same access, through
 * sendInvitation(); the old link stops working. Refused while the last send is newer than INVITATION_RESEND, so a
 * person's inbox can't be flooded. Audited as team.invitation.resent, next to sendInvitation's team.invited.
 */
export async function resendInvitation(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
  now: Date = new Date(),
): Promise<{ id: string }> {
  assertCan(actor, "team.manage", { organisationId });
  const [old] = await db
    .select()
    .from(inv)
    .where(and(eq(inv.id, id), eq(inv.organisationId, organisationId), isNull(inv.acceptedAt), isNull(inv.revokedAt)));
  if (!old) throw new TeamError("This invitation has already been used or cancelled");
  const { minutes } = await getSetting(db, INVITATION_RESEND);
  if (now.getTime() - old.createdAt.getTime() < minutes * 60_000)
    throw new TeamError(`This invitation was sent less than ${String(minutes)} minutes ago. Try again later.`);
  const sent = await sendInvitation(
    db,
    {
      organisationId,
      email: old.email,
      role: old.role,
      permissions: old.permissions,
      invitedBy: actor.userId,
      inviterRole: actor.companies.get(organisationId)?.role ?? "Admin",
      context,
    },
    now,
  );
  await db.transaction(async (tx) => {
    await tx.update(inv).set({ revokedAt: now }).where(eq(inv.id, old.id));
    await audit(tx, {
      actorId: actor.userId,
      action: "team.invitation.resent",
      resourceType: "invitation",
      resourceId: sent.id,
      companyId: organisationId,
      before: { invitationId: old.id, expiresAt: old.expiresAt.toISOString() },
      after: { invitationId: sent.id, email: old.email },
      context,
    });
  });
  return { id: sent.id };
}

/** Whether a person already agreed to the Terms (through Join or an earlier invitation): the invitation page asks if not. */
export async function agreedToTerms(db: Executor, userId: string): Promise<boolean> {
  const [person] = await db.select({ at: u.termsAcceptedAt }).from(u).where(eq(u.id, userId));
  return Boolean(person?.at);
}

/** What the invitation page shows before accepting. */
export async function invitationFor(db: Executor, token: string, now: Date = new Date()) {
  const [row] = await db
    .select({
      inv,
      legal: schema.organisations.legalName,
      trade: schema.companyProfiles.tradeName,
      kind: schema.organisations.kind,
    })
    .from(inv)
    .innerJoin(schema.organisations, eq(schema.organisations.id, inv.organisationId))
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, inv.organisationId))
    .where(eq(inv.tokenHash, hash(token)));
  if (!row) return null;
  const state = row.inv.acceptedAt
    ? "accepted"
    : row.inv.revokedAt
      ? "revoked"
      : row.inv.expiresAt <= now
        ? "expired"
        : "open";
  return {
    id: row.inv.id,
    email: row.inv.email,
    role: row.inv.role,
    permissions: row.inv.permissions,
    company: row.trade ?? row.legal,
    organisationId: row.inv.organisationId,
    /** Where the person lands after accepting. */
    workspace: row.kind === "buyer" ? "/buyer" : "/supplier",
    state,
  };
}

/**
 * Accept invitation: only the signed-in person whose email it was sent to; they join with the chosen role. Someone
 * who never went through Join hasn't agreed to the Terms yet: they agree here (`termsVersion`, the published version
 * shown with the checkbox), recorded as Join records it (admin QC, 16 Nov 2026).
 */
export async function acceptInvitation(
  db: Database,
  userId: string,
  token: string,
  context?: RequestContext,
  now: Date = new Date(),
  opts: { termsVersion?: string } = {},
) {
  const found = await invitationFor(db, token, now);
  if (!found || found.state !== "open")
    throw new TeamError("This invitation can't be used any more. Ask for a new one.");
  const [person] = await db
    .select({ email: u.email, termsAcceptedAt: u.termsAcceptedAt })
    .from(u)
    .where(eq(u.id, userId));
  if (person?.email.toLowerCase() !== found.email)
    throw new TeamError(`This invitation is for ${found.email}. Sign in with that email to accept it.`);
  if (!person.termsAcceptedAt && !opts.termsVersion)
    throw new TeamError("Agree to the Terms of use and Privacy policy to continue");
  await db.transaction(async (tx) => {
    await tx.update(inv).set({ acceptedAt: now }).where(eq(inv.id, found.id));
    // Admin QC: someone invited before they had an account hasn't been through Join, so give them the company's
    // workspace type; otherwise sign-in would keep sending them to Join.
    const [org] = await tx
      .select({ kind: schema.organisations.kind })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, found.organisationId));
    await tx
      .update(u)
      .set({ profileType: org?.kind === "buyer" ? "buyer" : "supplier" })
      .where(and(eq(u.id, userId), isNull(u.profileType)));
    if (!person.termsAcceptedAt)
      await tx
        .update(u)
        .set({ termsAcceptedAt: now, termsVersion: opts.termsVersion ?? null })
        .where(eq(u.id, userId));
    await tx
      .insert(m)
      .values({ organisationId: found.organisationId, userId, role: found.role, permissions: found.permissions })
      .onConflictDoUpdate({
        target: [m.organisationId, m.userId],
        set: { role: found.role, permissions: found.permissions },
      });
    await audit(tx, {
      actorId: userId,
      action: "team.joined",
      resourceType: "invitation",
      resourceId: found.id,
      companyId: found.organisationId,
      after: { role: found.role, permissions: found.permissions },
      context,
    });
  });
  return found;
}

/** Remove team member (685:318): they lose access at once; their work stays with the company. Not the last admin. */
export async function removeMember(
  db: Database,
  actor: Actor,
  organisationId: string,
  userId: string,
  context?: RequestContext,
) {
  assertCan(actor, "team.manage", { organisationId });
  await db.transaction(async (tx) => {
    const [seat] = await tx
      .select()
      .from(m)
      .where(and(eq(m.organisationId, organisationId), eq(m.userId, userId)))
      .for("update");
    if (!seat) throw new TeamError("This person is not in the team");
    if (seat.role === "Admin") {
      const [admins] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(m)
        .where(and(eq(m.organisationId, organisationId), eq(m.role, "Admin")));
      if ((admins?.n ?? 0) <= 1)
        throw new TeamError("A company needs at least one admin. Make someone else an admin first.");
    }
    await tx.delete(m).where(and(eq(m.organisationId, organisationId), eq(m.userId, userId)));
    await audit(tx, {
      actorId: actor.userId,
      action: "team.removed",
      resourceType: "membership",
      resourceId: userId,
      companyId: organisationId,
      before: { role: seat.role },
      context,
    });
  });
}
