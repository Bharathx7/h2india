import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";

// Reading and changing company records (step 3.4). Reads take a Scope; changes take the Actor and check can().
// Every new company-owned record type gets functions here and a cross-company test (authz.int.test.ts).

const { organisations: o, memberships: m, invitations: i, users: u } = schema;

export async function getOrganisation(ex: Executor, scope: Scope, organisationId: string) {
  const [row] = await ex
    .select()
    .from(o)
    .where(and(eq(o.id, organisationId), isNull(o.deletedAt), inScope(scope, o.id)));
  return row ?? null;
}

export async function listMembers(ex: Executor, scope: Scope, organisationId: string) {
  return ex
    .select({ userId: m.userId, name: u.name, email: u.email, role: m.role, orderLimitPaise: m.orderLimitPaise })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .where(and(eq(m.organisationId, organisationId), inScope(scope, m.organisationId)))
    .orderBy(m.createdAt);
}

export async function listInvitations(ex: Executor, scope: Scope, organisationId: string) {
  return ex
    .select({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt, acceptedAt: i.acceptedAt })
    .from(i)
    .where(and(eq(i.organisationId, organisationId), inScope(scope, i.organisationId)))
    .orderBy(i.createdAt);
}

/** Company settings: change the shown legal name. */
export async function renameOrganisation(
  ex: Executor,
  actor: Actor,
  organisationId: string,
  legalName: string,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  await ex.transaction(async (tx) => {
    const [before] = await tx.select({ legalName: o.legalName }).from(o).where(eq(o.id, organisationId)).for("update");
    await tx.update(o).set({ legalName: legalName.trim() }).where(eq(o.id, organisationId));
    await audit(tx, {
      actorId: actor.userId,
      action: "company.rename",
      resourceType: "organisation",
      resourceId: organisationId,
      companyId: organisationId,
      before: before ?? null,
      after: { legalName: legalName.trim() },
      context,
    });
  });
}

export class LastAdminError extends Error {
  constructor() {
    super("A company needs at least one admin. Make someone else an admin first.");
  }
}

/** Team settings: change someone's role or order limit. Audited with the values before and after. */
export async function changeMemberRole(
  ex: Executor,
  actor: Actor,
  input: { organisationId: string; userId: string; role: string; orderLimitPaise?: bigint | null; reason?: string },
  context?: RequestContext,
) {
  assertCan(actor, "team.manage", { organisationId: input.organisationId });
  const [org] = await ex.select({ kind: o.kind }).from(o).where(eq(o.id, input.organisationId));
  const [known] = await ex
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(
      and(eq(schema.roles.scope, org?.kind === "supplier" ? "supplier" : "buyer"), eq(schema.roles.name, input.role)),
    );
  if (!known) throw new Error(`No role "${input.role}" for this company`);
  const seat = and(eq(m.organisationId, input.organisationId), eq(m.userId, input.userId));
  await ex.transaction(async (tx) => {
    const [before] = await tx
      .select({ role: m.role, orderLimitPaise: m.orderLimitPaise })
      .from(m)
      .where(seat)
      .for("update");
    if (!before) throw new Error("This person is not in the company");
    // Never the last admin (founder QC, 17 Nov 2026: the last Admin could make themselves Sales and lock the company
    // out of its own team and settings). removeMember() has the same rule.
    if (before.role === "Admin" && input.role !== "Admin") {
      const [admins] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(m)
        .where(and(eq(m.organisationId, input.organisationId), eq(m.role, "Admin")));
      if ((admins?.n ?? 0) <= 1) throw new LastAdminError();
    }
    const orderLimitPaise = input.orderLimitPaise !== undefined ? input.orderLimitPaise : before.orderLimitPaise;
    // A role chosen by name takes the role's defaults again (the member's own ticks are cleared).
    await tx.update(m).set({ role: input.role, permissions: null, orderLimitPaise }).where(seat);
    const money = (v: bigint | null) => (v === null ? null : v.toString());
    await audit(tx, {
      actorId: actor.userId,
      action: "membership.change",
      resourceType: "membership",
      resourceId: input.userId,
      companyId: input.organisationId,
      before: { role: before.role, orderLimitPaise: money(before.orderLimitPaise) },
      after: { role: input.role, orderLimitPaise: money(orderLimitPaise) },
      reason: input.reason ?? null,
      context,
    });
  });
}
