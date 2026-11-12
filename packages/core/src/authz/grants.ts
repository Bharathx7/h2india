import { schema, type Executor } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "./actor";
import { assertCan } from "./can";

// Who holds which operator role (step 3.6; the Users and Operator roles screens come in step 11.4). Changing operator
// roles needs Super admin (playbook 11.4): only Super admin holds roles.manage. Every grant and removal is audited.

const { roles: r, operatorRoles: or, users: u } = schema;

export const SUPER_ADMIN = "Super admin";

export class OperatorRoleError extends Error {
  constructor(
    readonly code: "NO_SUCH_ROLE" | "NO_SUCH_USER" | "LAST_SUPER_ADMIN",
    message: string,
  ) {
    super(message);
  }
}

async function operatorRole(ex: Executor, name: string) {
  const [role] = await ex
    .select({ id: r.id, name: r.name })
    .from(r)
    .where(and(eq(r.scope, "operator"), eq(r.name, name)));
  if (!role) throw new OperatorRoleError("NO_SUCH_ROLE", `No operator role "${name}"`);
  return role;
}

async function rolesOf(ex: Executor, userId: string): Promise<string[]> {
  const rows = await ex
    .select({ name: r.name })
    .from(or)
    .innerJoin(r, eq(r.id, or.roleId))
    .where(eq(or.userId, userId))
    .orderBy(r.name);
  return rows.map((x) => x.name);
}

export async function grantOperatorRole(
  ex: Executor,
  actor: Actor,
  input: { userId: string; role: string; reason?: string },
  context?: RequestContext,
): Promise<void> {
  assertCan(actor, "roles.manage");
  await ex.transaction(async (tx) => {
    const role = await operatorRole(tx, input.role);
    const [user] = await tx.select({ id: u.id }).from(u).where(eq(u.id, input.userId));
    if (!user) throw new OperatorRoleError("NO_SUCH_USER", "No such person");
    const before = await rolesOf(tx, input.userId);
    if (before.includes(role.name)) return;
    await tx
      .insert(or)
      .values({ userId: input.userId, roleId: role.id, grantedBy: actor.userId })
      .onConflictDoNothing();
    await audit(tx, {
      actorId: actor.userId,
      action: "operator_role.grant",
      resourceType: "user",
      resourceId: input.userId,
      before: { roles: before },
      after: { roles: [...before, role.name].sort() },
      reason: input.reason ?? null,
      context,
    });
  });
}

export async function revokeOperatorRole(
  ex: Executor,
  actor: Actor,
  input: { userId: string; role: string; reason?: string },
  context?: RequestContext,
): Promise<void> {
  assertCan(actor, "roles.manage");
  await ex.transaction(async (tx) => {
    const role = await operatorRole(tx, input.role);
    const before = await rolesOf(tx, input.userId);
    if (!before.includes(role.name)) return;
    if (role.name === SUPER_ADMIN) {
      // Serialise removals so two Super admins can't remove each other at the same moment.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('operator_role.super_admin'))`);
      const [count] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(or)
        .where(eq(or.roleId, role.id));
      if ((count?.n ?? 0) <= 1) {
        throw new OperatorRoleError("LAST_SUPER_ADMIN", "There must always be at least one Super admin");
      }
    }
    await tx.delete(or).where(and(eq(or.userId, input.userId), eq(or.roleId, role.id)));
    await audit(tx, {
      actorId: actor.userId,
      action: "operator_role.revoke",
      resourceType: "user",
      resourceId: input.userId,
      before: { roles: before },
      after: { roles: before.filter((n) => n !== role.name) },
      reason: input.reason ?? null,
      context,
    });
  });
}
