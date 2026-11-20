import { schema, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { OPERATOR_ACTIONS, SENSITIVE_AREAS } from "../authz/catalogue";
import { SUPER_ADMIN } from "../authz/grants";
import { cleanSections, completePermissions, StaffError, SUPER_ADMIN_ONLY } from "../authz/staff-rules";
import { stepUpConfirmedRecently } from "../sign-in/step-up";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Team and roles (founder, 20 Nov 2026: "first the Super admin has all access, then if needed adds other roles"). A
// Super admin (roles.manage) adds staff, limits an editor to content sections and makes custom roles from the
// built-in ones. Built-in roles stay as seeded; Super admin-only permissions never go to a custom role; adding a role
// that touches money, bank or personal data, or who can do what, needs Confirm it's you. Every change is audited.

const { roles: r, rolePermissions: rp, permissions: p, operatorRoles: or, operatorSections: os, users: u } = schema;

/** Sections the person may change, or null for every section. */
export async function staffSections(ex: Executor, userId: string): Promise<string[] | null> {
  const rows = await ex.select({ section: os.section }).from(os).where(eq(os.userId, userId)).orderBy(asc(os.section));
  return rows.length ? rows.map((x) => x.section) : null;
}

async function writeSections(tx: Executor, userId: string, sections: string[] | null, by: string | null) {
  await tx.delete(os).where(eq(os.userId, userId));
  if (sections?.length) await tx.insert(os).values(sections.map((section) => ({ userId, section, grantedBy: by })));
}

/** Operator permission keys that are sensitive: flagged in the catalogue, or more than View in a sensitive area. */
async function sensitiveKeys(ex: Executor): Promise<Set<string>> {
  const flagged = await ex
    .select({ key: p.key })
    .from(p)
    .where(and(eq(p.layer, "operator"), eq(p.sensitive, true)));
  const grid = SENSITIVE_AREAS.flatMap((a) => OPERATOR_ACTIONS.filter((x) => x !== "view").map((x) => `${a}.${x}`));
  return new Set([...flagged.map((x) => x.key), ...grid]);
}

async function needConfirm(ex: Executor, actor: Actor, adding: Iterable<string>) {
  const sensitive = await sensitiveKeys(ex);
  if (![...adding].some((k) => sensitive.has(k))) return;
  if (!actor.userId || !(await stepUpConfirmedRecently(ex, actor.userId)))
    throw new StaffError("CONFIRM", "Confirm it's you first: this gives access to sensitive areas");
}

async function roleByName(ex: Executor, name: string) {
  const [role] = await ex
    .select({ id: r.id, name: r.name })
    .from(r)
    .where(and(eq(r.scope, "operator"), eq(r.name, name)));
  if (!role) throw new StaffError("NO_SUCH_ROLE", `No role called "${name}"`);
  const perms = await ex.select({ key: rp.permissionKey }).from(rp).where(eq(rp.roleId, role.id));
  return { ...role, permissions: perms.map((x) => x.key) };
}

/**
 * Add someone to the team: makes their account if there is none (they set a password from the emailed link), gives
 * them the role and, for an editor, the content sections they may change. Returns whether the account is new.
 */
export async function addStaffMember(
  ex: Executor,
  actor: Actor,
  input: { email: string; name: string; role: string; sections: readonly string[] | null; reason: string },
  context?: RequestContext,
): Promise<{ userId: string; created: boolean }> {
  assertCan(actor, "roles.manage");
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!EMAIL.test(email)) throw new StaffError("BAD_EMAIL", "Enter their work email");
  if (name.length < 2) throw new StaffError("BAD_NAME", "Enter their name");
  const sections = cleanSections(input.sections);
  return ex.transaction(async (tx) => {
    const role = await roleByName(tx, input.role);
    await needConfirm(tx, actor, role.permissions);
    const [found] = await tx.select({ id: u.id, name: u.name }).from(u).where(eq(u.email, email));
    const user = found ?? (await tx.insert(u).values({ email, name, emailVerified: true }).returning({ id: u.id }))[0];
    if (!user) throw new StaffError("BAD_EMAIL", "Could not make the account");
    if (found && !found.name) await tx.update(u).set({ name }).where(eq(u.id, found.id));
    const before = await tx
      .select({ name: r.name })
      .from(or)
      .innerJoin(r, eq(r.id, or.roleId))
      .where(eq(or.userId, user.id));
    const beforeSections = await staffSections(tx, user.id);
    await tx.insert(or).values({ userId: user.id, roleId: role.id, grantedBy: actor.userId }).onConflictDoNothing();
    await writeSections(tx, user.id, role.name === SUPER_ADMIN ? null : sections, actor.userId);
    await audit(tx, {
      actorId: actor.userId,
      action: "staff.add",
      resourceType: "user",
      resourceId: user.id,
      before: { roles: before.map((x) => x.name).sort(), sections: beforeSections },
      after: {
        roles: [...new Set([...before.map((x) => x.name), role.name])].sort(),
        sections: role.name === SUPER_ADMIN ? null : sections,
        newAccount: !found,
      },
      reason: input.reason.trim() || null,
      context,
    });
    return { userId: user.id, created: !found };
  });
}

/** Change the content sections a staff member may change (null: every section). */
export async function setStaffSections(
  ex: Executor,
  actor: Actor,
  input: { userId: string; sections: readonly string[] | null; reason: string },
  context?: RequestContext,
): Promise<void> {
  assertCan(actor, "roles.manage");
  const sections = cleanSections(input.sections);
  await ex.transaction(async (tx) => {
    const before = await staffSections(tx, input.userId);
    await writeSections(tx, input.userId, sections, actor.userId);
    await audit(tx, {
      actorId: actor.userId,
      action: "staff.sections",
      resourceType: "user",
      resourceId: input.userId,
      before: { sections: before },
      after: { sections },
      reason: input.reason.trim() || null,
      context,
    });
  });
}

export interface StaffRow {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  sections: string[] | null;
  lastActive: Date | null;
}

/** Everyone with an operator role, with their roles, sections and last activity. */
export async function listStaff(ex: Executor, actor: Actor): Promise<StaffRow[]> {
  assertCan(actor, "users.view");
  const rows = await ex
    .select({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: r.name,
      lastActive: sql<Date | null>`(select max(s.updated_at) from core.sessions s where s.user_id = ${u.id})`,
    })
    .from(or)
    .innerJoin(u, eq(u.id, or.userId))
    .innerJoin(r, eq(r.id, or.roleId))
    .orderBy(asc(u.name), asc(r.name));
  const ids = [...new Set(rows.map((x) => x.userId))];
  const sec = ids.length
    ? await ex.select({ userId: os.userId, section: os.section }).from(os).where(inArray(os.userId, ids))
    : [];
  const out = new Map<string, StaffRow>();
  for (const x of rows) {
    const row = out.get(x.userId) ?? {
      userId: x.userId,
      name: x.name,
      email: x.email,
      roles: [],
      sections: null,
      lastActive: x.lastActive ? new Date(x.lastActive) : null,
    };
    row.roles.push(x.role);
    out.set(x.userId, row);
  }
  for (const row of out.values()) {
    const mine = sec.filter((s) => s.userId === row.userId).map((s) => s.section);
    row.sections = mine.length ? mine.sort() : null;
  }
  return [...out.values()];
}

/** The permissions a custom role may hold: every operator permission except the Super admin-only ones. */
export async function grantableOperatorPermissions(ex: Executor): Promise<string[]> {
  const rows = await ex.select({ key: p.key }).from(p).where(eq(p.layer, "operator"));
  return rows.map((x) => x.key).filter((k) => !SUPER_ADMIN_ONLY.includes(k));
}

/** Create a custom role, or change one; built-in roles can't be changed here. */
export async function saveOperatorRole(
  ex: Executor,
  actor: Actor,
  input: { roleId?: string; name: string; description: string; permissions: readonly string[]; reason: string },
  context?: RequestContext,
): Promise<{ roleId: string }> {
  assertCan(actor, "roles.manage");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new StaffError("BAD_NAME", "Give the role a name (2 to 60 letters)");
  const permissions = completePermissions(input.permissions);
  if (!permissions.length) throw new StaffError("BAD_PERMISSIONS", "Tick at least one permission");
  const allowed = new Set(await grantableOperatorPermissions(ex));
  const refused = permissions.filter((k) => !allowed.has(k));
  if (refused.length)
    throw new StaffError("BAD_PERMISSIONS", `A custom role can't have: ${refused.join(", ")} (Super admin only)`);
  return ex.transaction(async (tx) => {
    const [clash] = await tx
      .select({ id: r.id })
      .from(r)
      .where(and(eq(r.scope, "operator"), sql`lower(${r.name}) = ${name.toLowerCase()}`));
    if (clash && clash.id !== input.roleId) throw new StaffError("NAME_TAKEN", "Another role already has this name");
    let before: { name: string; description: string; permissions: string[] } | null = null;
    let roleId = input.roleId;
    if (roleId) {
      const [row] = await tx
        .select({ name: r.name, description: r.description, custom: r.custom })
        .from(r)
        .where(and(eq(r.id, roleId), eq(r.scope, "operator")));
      if (!row) throw new StaffError("NO_SUCH_ROLE", "That role no longer exists");
      if (!row.custom) throw new StaffError("BUILT_IN", "Built-in roles can't be changed; copy it to make your own");
      const perms = await tx.select({ key: rp.permissionKey }).from(rp).where(eq(rp.roleId, roleId));
      before = { name: row.name, description: row.description, permissions: perms.map((x) => x.key).sort() };
    }
    const prior = new Set(before?.permissions ?? []);
    await needConfirm(
      tx,
      actor,
      permissions.filter((k) => !prior.has(k)),
    );
    if (roleId) {
      await tx
        .update(r)
        .set({ name, description: input.description.trim(), updatedAt: new Date() })
        .where(eq(r.id, roleId));
      await tx.delete(rp).where(eq(rp.roleId, roleId));
    } else {
      const [made] = await tx
        .insert(r)
        .values({ scope: "operator", name, description: input.description.trim(), custom: true })
        .returning({ id: r.id });
      roleId = made?.id;
      if (!roleId) throw new StaffError("NO_SUCH_ROLE", "Could not make the role");
    }
    const id = roleId;
    await tx.insert(rp).values(permissions.map((permissionKey) => ({ roleId: id, permissionKey })));
    await audit(tx, {
      actorId: actor.userId,
      action: before ? "operator_role.update" : "operator_role.create",
      resourceType: "role",
      resourceId: id,
      before,
      after: { name, description: input.description.trim(), permissions },
      reason: input.reason.trim() || null,
      context,
    });
    return { roleId: id };
  });
}

/** Delete a custom role nobody holds. */
export async function deleteOperatorRole(
  ex: Executor,
  actor: Actor,
  input: { roleId: string; reason: string },
  context?: RequestContext,
): Promise<void> {
  assertCan(actor, "roles.manage");
  await ex.transaction(async (tx) => {
    const [row] = await tx
      .select({ name: r.name, custom: r.custom })
      .from(r)
      .where(and(eq(r.id, input.roleId), eq(r.scope, "operator")));
    if (!row) throw new StaffError("NO_SUCH_ROLE", "That role no longer exists");
    if (!row.custom) throw new StaffError("BUILT_IN", "Built-in roles can't be deleted");
    const [held] = await tx.select({ id: or.userId }).from(or).where(eq(or.roleId, input.roleId)).limit(1);
    if (held) throw new StaffError("ROLE_IN_USE", "Move everyone off this role first");
    const perms = await tx.select({ key: rp.permissionKey }).from(rp).where(eq(rp.roleId, input.roleId));
    await tx.delete(r).where(eq(r.id, input.roleId));
    await audit(tx, {
      actorId: actor.userId,
      action: "operator_role.delete",
      resourceType: "role",
      resourceId: input.roleId,
      before: { name: row.name, permissions: perms.map((x) => x.key).sort() },
      after: null,
      reason: input.reason.trim() || null,
      context,
    });
  });
}
