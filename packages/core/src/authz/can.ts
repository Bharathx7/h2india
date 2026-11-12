import type { Actor } from "./actor";
import { COMPANY_PERMISSIONS, type OperatorPermission, type Permission } from "./catalogue";

// can(actor, action, resource): the one place a permission is decided (step 3.4). Every rule is enforced on the
// server; hiding a button is not security.

export interface Resource {
  /** The company that owns the record, if any. */
  organisationId?: string | null;
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(readonly permission: Permission) {
    super(`Not allowed: ${permission}`);
  }
}

function isCompanyPermission(permission: Permission): permission is keyof typeof COMPANY_PERMISSIONS {
  return permission in COMPANY_PERMISSIONS;
}

export function can(actor: Actor, permission: Permission, resource: Resource = {}): boolean {
  if (!actor.userId) return false;
  if (!isCompanyPermission(permission)) return actor.operator.has(permission satisfies OperatorPermission);
  if (!resource.organisationId) return false;
  return actor.companies.get(resource.organisationId)?.permissions.has(permission) ?? false;
}

export function assertCan(actor: Actor, permission: Permission, resource: Resource = {}): void {
  if (!can(actor, permission, resource)) throw new ForbiddenError(permission);
}

/** Whether an order of this value is within the person's own limit in that company (575:696). */
export function withinLimit(actor: Actor, organisationId: string, valuePaise: bigint): boolean {
  const seat = actor.companies.get(organisationId);
  if (!seat) return false;
  return seat.orderLimitPaise === null || valuePaise <= seat.orderLimitPaise;
}
