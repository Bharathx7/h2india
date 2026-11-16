import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { OperatorPermission, Permission } from "./catalogue";

// Who is asking (step 3.4). Loaded from the database on every request, so a role change applies at once.

export type PlatformRole = "visitor" | "member" | "company_user" | "operator";

export interface CompanySeat {
  role: string;
  kind: string;
  permissions: ReadonlySet<string>;
  orderLimitPaise: bigint | null;
}

export interface Actor {
  readonly userId: string | null;
  readonly platform: ReadonlySet<PlatformRole>;
  /** Companies the person belongs to, by organisation id. */
  readonly companies: ReadonlyMap<string, CompanySeat>;
  /** Operator permissions, for H2 Economy staff. */
  readonly operator: ReadonlySet<string>;
}

export const VISITOR: Actor = {
  userId: null,
  platform: new Set(["visitor"]),
  companies: new Map(),
  operator: new Set(),
};

const { memberships: m, organisations: o, roles: r, rolePermissions: rp, operatorRoles: or, users: u } = schema;

/**
 * Operator access gate (step 12.1, review H2): the web app registers a check that this request's session was made with
 * a passkey (A172). Without it (worker, scripts, tests) operator roles count as stored. A failing check drops the
 * operator permissions only; the person keeps their company and member access.
 */
let operatorGate: ((userId: string) => Promise<boolean>) | null = null;

export function setOperatorGate(gate: ((userId: string) => Promise<boolean>) | null) {
  operatorGate = gate;
}

/** Whether a person holds any operator role, whatever the gate says (to send them to the passkey step). */
export async function hasOperatorRole(ex: Executor, userId: string): Promise<boolean> {
  const rows = await ex.select({ userId: or.userId }).from(or).where(eq(or.userId, userId)).limit(1);
  return rows.length > 0;
}

export async function loadActor(ex: Executor, userId: string | null | undefined): Promise<Actor> {
  if (!userId) return VISITOR;
  const seats = await ex
    .select({
      organisationId: m.organisationId,
      role: m.role,
      kind: o.kind,
      orderLimitPaise: m.orderLimitPaise,
      permissions: sql<
        string[]
      >`coalesce(array_agg(${rp.permissionKey}) filter (where ${rp.permissionKey} is not null), '{}')`,
    })
    .from(m)
    .innerJoin(o, and(eq(o.id, m.organisationId), isNull(o.deletedAt)))
    .leftJoin(
      r,
      and(eq(r.name, m.role), sql`${r.scope} = case when ${o.kind} = 'supplier' then 'supplier' else 'buyer' end`),
    )
    .leftJoin(rp, eq(rp.roleId, r.id))
    .where(eq(m.userId, userId))
    .groupBy(m.organisationId, m.role, o.kind, m.orderLimitPaise);
  const stored = await ex
    .select({ key: rp.permissionKey })
    .from(or)
    .innerJoin(rp, eq(rp.roleId, or.roleId))
    .where(eq(or.userId, userId));
  const ops = stored.length > 0 && operatorGate && !(await operatorGate(userId)) ? [] : stored;
  const [profile] = await ex
    .select({ type: u.profileType, suspendedAt: u.suspendedAt })
    .from(u)
    .where(eq(u.id, userId));
  // A suspended person can do nothing, whatever session they still hold (review H1, step 11.4).
  if (profile?.suspendedAt) return VISITOR;

  const platform = new Set<PlatformRole>();
  if (profile?.type) platform.add("member");
  if (seats.length > 0) platform.add("company_user");
  if (ops.length > 0) platform.add("operator");
  if (platform.size === 0) platform.add("member");
  return {
    userId,
    platform,
    companies: new Map(
      seats.map((s) => [
        s.organisationId,
        { role: s.role, kind: s.kind, permissions: new Set(s.permissions), orderLimitPaise: s.orderLimitPaise },
      ]),
    ),
    operator: new Set(ops.map((x) => x.key)),
  };
}

export type { OperatorPermission, Permission };
