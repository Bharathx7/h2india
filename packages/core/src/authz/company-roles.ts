import { schema, type Database, type Executor } from "@h2india/db";
import { and, eq, inArray } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "./actor";
import { assertCan } from "./can";
import { COMPANY_PERMISSIONS, ROLES, type CompanyPermission } from "./catalogue";

// Custom role permissions per company (founder QC, 17 Nov 2026): on Team, a company admin ticks what each role may do.
// The defaults stay in catalogue.ts; a company stores only its differences (core.company_role_permissions), and
// loadActor() applies them, so every can() check sees them at once.
// Safety: the Admin role is never changed, and company settings, the team and the payout bank account stay with
// Admins only, so a company can't lock itself out or hand its money to a role by mistake.

export type CompanyKind = "buyer" | "supplier";

/** Never ticked for another role, whatever the company chooses. */
export const ADMIN_ONLY: readonly CompanyPermission[] = ["company.manage", "team.manage", "payout_bank.change"];
export const LOCKED_ROLE = "Admin";

/** The boxes on each kind of company's grid, in the order shown. */
export const GRANTABLE: Record<CompanyKind, readonly CompanyPermission[]> = {
  buyer: [
    "company.view",
    "rfq.view",
    "rfq.create",
    "order.view",
    "order.place",
    "order.approve",
    "messages.use",
    "money.view",
    "verification.manage",
    "approval_rules.manage",
  ],
  supplier: [
    "company.view",
    "rfq.view",
    "quote.send",
    "order.view",
    "order.manage",
    "messages.use",
    "product.manage",
    "storefront.manage",
    "money.view",
    "verification.manage",
  ],
};

export class RolePermissionError extends Error {}

const crp = schema.companyRolePermissions;

export const kindOf = (orgKind: string | null | undefined): CompanyKind =>
  orgKind === "supplier" ? "supplier" : "buyer";

/** The default permissions of a company role, from the catalogue. */
export function defaultPermissions(kind: CompanyKind, role: string): ReadonlySet<string> {
  return new Set(ROLES.find((r) => r.scope === kind && r.name === role)?.permissions ?? []);
}

/** A role's permissions after the company's own changes. Pure; loadActor() and the grid both use it. */
export function applyChanges(
  base: Iterable<string>,
  changes: readonly { permissionKey: string; granted: boolean }[],
): Set<string> {
  const out = new Set(base);
  for (const c of changes) {
    if (ADMIN_ONLY.includes(c.permissionKey as CompanyPermission)) continue;
    if (c.granted) out.add(c.permissionKey);
    else out.delete(c.permissionKey);
  }
  return out;
}

/** Each company's changes for the given (company, role) seats, for loadActor(). */
export async function roleChangesFor(
  ex: Executor,
  seats: readonly { organisationId: string; role: string }[],
): Promise<Map<string, { permissionKey: string; granted: boolean }[]>> {
  const out = new Map<string, { permissionKey: string; granted: boolean }[]>();
  const editable = seats.filter((s) => s.role !== LOCKED_ROLE);
  if (!editable.length) return out;
  const rows = await ex
    .select({
      organisationId: crp.organisationId,
      role: crp.role,
      permissionKey: crp.permissionKey,
      granted: crp.granted,
    })
    .from(crp)
    .where(inArray(crp.organisationId, [...new Set(editable.map((s) => s.organisationId))]));
  for (const r of rows) {
    if (!editable.some((s) => s.organisationId === r.organisationId && s.role === r.role)) continue;
    const key = `${r.organisationId}|${r.role}`;
    out.set(key, [...(out.get(key) ?? []), { permissionKey: r.permissionKey, granted: r.granted }]);
  }
  return out;
}

export interface RoleGridRow {
  name: string;
  description: string;
  editable: boolean;
  /** Ticked permissions after the company's changes. */
  permissions: string[];
  /** Permissions that differ from the default (to show "Changed"). */
  changed: string[];
}

/** The Team page's grid: every role of the company's kind, its ticks, and which boxes may change. */
export async function roleGrid(ex: Executor, actor: Actor, organisationId: string) {
  assertCan(actor, "company.view", { organisationId });
  const [org] = await ex
    .select({ kind: schema.organisations.kind })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  const kind = kindOf(org?.kind);
  const changes = await ex
    .select({ role: crp.role, permissionKey: crp.permissionKey, granted: crp.granted })
    .from(crp)
    .where(eq(crp.organisationId, organisationId));
  const roles: RoleGridRow[] = ROLES.filter((r) => r.scope === kind).map((r) => {
    const editable = r.name !== LOCKED_ROLE;
    const base = defaultPermissions(kind, r.name);
    const mine = editable ? changes.filter((c) => c.role === r.name) : [];
    const now = applyChanges(base, mine);
    return {
      name: r.name,
      description: r.description,
      editable,
      permissions: [...now],
      changed: GRANTABLE[kind].filter((p) => now.has(p) !== base.has(p)),
    };
  });
  return {
    kind,
    permissions: GRANTABLE[kind].map((key) => ({ key, label: COMPANY_PERMISSIONS[key] })),
    roles,
  };
}

/**
 * Ticks or clears one box for one role (team.manage). Matching the default removes the company's change. Audited
 * with the value before and after.
 */
export async function setRolePermission(
  db: Database,
  actor: Actor,
  input: { organisationId: string; role: string; permission: string; on: boolean },
  context?: RequestContext,
) {
  assertCan(actor, "team.manage", { organisationId: input.organisationId });
  const [org] = await db
    .select({ kind: schema.organisations.kind })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, input.organisationId));
  const kind = kindOf(org?.kind);
  if (input.role === LOCKED_ROLE) throw new RolePermissionError("Admins can always do everything.");
  if (!ROLES.some((r) => r.scope === kind && r.name === input.role))
    throw new RolePermissionError(`No role "${input.role}" for this company.`);
  if (!(GRANTABLE[kind] as readonly string[]).includes(input.permission))
    throw new RolePermissionError("Only an admin can have this permission.");
  const base = defaultPermissions(kind, input.role).has(input.permission);
  const where = and(
    eq(crp.organisationId, input.organisationId),
    eq(crp.role, input.role),
    eq(crp.permissionKey, input.permission),
  );
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ granted: crp.granted }).from(crp).where(where).for("update");
    const was = before ? before.granted : base;
    if (was === input.on) return;
    if (input.on === base) await tx.delete(crp).where(where);
    else if (before)
      await tx.update(crp).set({ granted: input.on, changedBy: actor.userId, updatedAt: new Date() }).where(where);
    else
      await tx.insert(crp).values({
        organisationId: input.organisationId,
        role: input.role,
        permissionKey: input.permission,
        granted: input.on,
        changedBy: actor.userId,
      });
    await audit(tx, {
      actorId: actor.userId,
      action: "role.permission_changed",
      resourceType: "organisation",
      resourceId: input.organisationId,
      companyId: input.organisationId,
      before: { role: input.role, permission: input.permission, on: was },
      after: { role: input.role, permission: input.permission, on: input.on },
      context,
    });
  });
}
