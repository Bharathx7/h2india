import { inArray, sql, type Column, type SQL } from "drizzle-orm";
import type { Actor } from "./actor";
import type { OperatorArea } from "./catalogue";

// The query scope (step 3.4). Every repository function over a company-owned table takes a Scope as its first,
// required argument. A Scope can only be made by scopeFor(), so a query without one does not compile.

declare const scopeBrand: unique symbol;

export interface Scope {
  readonly [scopeBrand]: true;
  readonly actorId: string | null;
  /** Operators with view permission on the area see every company. */
  readonly everyCompany: boolean;
  readonly organisationIds: readonly string[];
}

/**
 * The companies this person may read. Company members see their own companies; an operator sees every company when
 * they hold `${area}.view` for the area being read.
 */
export function scopeFor(actor: Actor, options: { operatorArea?: OperatorArea } = {}): Scope {
  const everyCompany = options.operatorArea !== undefined && actor.operator.has(`${options.operatorArea}.view`);
  return {
    actorId: actor.userId,
    everyCompany,
    organisationIds: [...actor.companies.keys()],
  } as unknown as Scope;
}

/** The WHERE condition limiting a company-owned table to the scope. */
export function inScope(scope: Scope, organisationColumn: Column): SQL {
  if (scope.everyCompany) return sql`true`;
  if (scope.organisationIds.length === 0) return sql`false`;
  return inArray(organisationColumn, [...scope.organisationIds]);
}
