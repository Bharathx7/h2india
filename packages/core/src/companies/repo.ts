import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";
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
export async function renameOrganisation(ex: Executor, actor: Actor, organisationId: string, legalName: string) {
  assertCan(actor, "company.manage", { organisationId });
  await ex.update(o).set({ legalName: legalName.trim() }).where(eq(o.id, organisationId));
}

/** Team settings: change someone's role or order limit. */
export async function changeMemberRole(
  ex: Executor,
  actor: Actor,
  input: { organisationId: string; userId: string; role: string; orderLimitPaise?: bigint | null },
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
  await ex
    .update(m)
    .set({
      role: input.role,
      ...(input.orderLimitPaise !== undefined ? { orderLimitPaise: input.orderLimitPaise } : {}),
    })
    .where(and(eq(m.organisationId, input.organisationId), eq(m.userId, input.userId)));
}
