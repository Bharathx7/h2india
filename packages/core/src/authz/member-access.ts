import { schema, type Database } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "./actor";
import { assertCan } from "./can";
import { COMPANY_PERMISSIONS, ROLES, type CompanyPermission } from "./catalogue";
import { ADMIN_ONLY, defaultPermissions, GRANTABLE, kindOf, LOCKED_ROLE, type CompanyKind } from "./company-roles";

// Each member's own access (founder QC, 17 Nov 2026): when an admin adds or edits a team member they tick what that
// person may do, from every permission the company kind has, with quick presets (the old roles) that tick boxes for
// them. Admin (full access) stays a role of its own and keeps the admin-only permissions (company settings, the team,
// the payout bank account), so a company can't lock itself out. Stored on memberships.permissions; loadActor() uses
// it instead of the role's defaults. A member with no own list keeps their role's defaults, as before.

export class MemberAccessError extends Error {}

/** What the form sends: full access, or a list of ticked permissions. */
export interface AccessChoice {
  admin: boolean;
  permissions: readonly string[];
}

export interface AccessPreset {
  name: string;
  description: string;
  permissions: CompanyPermission[];
}

/** The presets for a company kind: every role except Admin, with the permissions a member can be given. */
export function accessPresets(kind: CompanyKind): AccessPreset[] {
  return ROLES.filter((r) => r.scope === kind && r.name !== LOCKED_ROLE).map((r) => ({
    name: r.name,
    description: r.description,
    permissions: GRANTABLE[kind].filter((p) => defaultPermissions(kind, r.name).has(p)),
  }));
}

/** Every permission a member can be given, in the order the form lists them, with its words. */
export function grantablePermissions(kind: CompanyKind) {
  return GRANTABLE[kind].map((key) => ({ key, label: COMPANY_PERMISSIONS[key] }));
}

/**
 * Checks a choice and says how to store it: Admin with no list, a preset's name when the ticks match one exactly,
 * otherwise "Custom" with the list. Pure.
 */
export function storedAccess(kind: CompanyKind, choice: AccessChoice): { role: string; permissions: string[] | null } {
  if (choice.admin) return { role: LOCKED_ROLE, permissions: null };
  const allowed = GRANTABLE[kind] as readonly string[];
  const ticked = [...new Set(choice.permissions)];
  if (ticked.some((p) => (ADMIN_ONLY as readonly string[]).includes(p)))
    throw new MemberAccessError("Company settings, the team and the payout bank account come only with full access");
  if (ticked.some((p) => !allowed.includes(p))) throw new MemberAccessError("Choose from the list");
  if (!ticked.length) throw new MemberAccessError("Tick at least one thing they can do");
  const ordered = allowed.filter((p) => ticked.includes(p));
  const preset = accessPresets(kind).find(
    (r) => r.permissions.length === ordered.length && r.permissions.every((p) => ordered.includes(p)),
  );
  return { role: preset?.name ?? "Custom", permissions: ordered };
}

/** The permissions a seat has from its own list (loadActor). Admin-only ones are never kept. */
export function ownPermissions(kind: CompanyKind, list: readonly string[]): Set<string> {
  const allowed = GRANTABLE[kind] as readonly string[];
  return new Set(list.filter((p) => allowed.includes(p)));
}

/**
 * Edit access for one member (team.manage, audited). Never leaves the company without an Admin. Clears any order
 * limit only when the member loses order approval.
 */
export async function setMemberAccess(
  db: Database,
  actor: Actor,
  input: { organisationId: string; userId: string; access: AccessChoice },
  context?: RequestContext,
) {
  assertCan(actor, "team.manage", { organisationId: input.organisationId });
  const m = schema.memberships;
  const [org] = await db
    .select({ kind: schema.organisations.kind })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, input.organisationId));
  const next = storedAccess(kindOf(org?.kind), input.access);
  const seat = and(eq(m.organisationId, input.organisationId), eq(m.userId, input.userId));
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ role: m.role, permissions: m.permissions }).from(m).where(seat).for("update");
    if (!before) throw new MemberAccessError("This person is not in the team");
    if (before.role === LOCKED_ROLE && next.role !== LOCKED_ROLE) {
      const [admins] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(m)
        .where(and(eq(m.organisationId, input.organisationId), eq(m.role, LOCKED_ROLE)));
      if ((admins?.n ?? 0) <= 1)
        throw new MemberAccessError("A company needs at least one admin. Give someone else full access first.");
    }
    await tx
      .update(m)
      .set({
        role: next.role,
        permissions: next.permissions,
        ...(next.permissions && !next.permissions.includes("order.approve") ? { orderLimitPaise: null } : {}),
        updatedAt: new Date(),
      })
      .where(seat);
    await audit(tx, {
      actorId: actor.userId,
      action: "membership.access_changed",
      resourceType: "membership",
      resourceId: input.userId,
      companyId: input.organisationId,
      before: { role: before.role, permissions: before.permissions },
      after: { role: next.role, permissions: next.permissions },
      context,
    });
  });
}
