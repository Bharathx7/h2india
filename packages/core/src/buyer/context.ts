import { schema, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import type { Actor, CompanySeat } from "../authz/actor";

// The buyer workspace (Stage 9) works on one buyer company: the first company the person belongs to whose kind is
// buyer or both.

export interface BuyerContext {
  organisationId: string;
  seat: CompanySeat;
  legalName: string;
  city: string | null;
  state: string | null;
}

export async function buyerOf(db: Executor, actor: Actor): Promise<BuyerContext | null> {
  const entry = [...actor.companies.entries()].find(([, s]) => s.kind === "buyer" || s.kind === "both");
  if (!entry) return null;
  const [organisationId, seat] = entry;
  const [row] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, organisationId));
  if (!row) return null;
  const [site] = await db
    .select({ city: schema.deliverySites.city })
    .from(schema.deliverySites)
    .where(eq(schema.deliverySites.organisationId, organisationId))
    .limit(1);
  return { organisationId, seat, legalName: row.legalName, city: site?.city ?? null, state: row.state };
}
