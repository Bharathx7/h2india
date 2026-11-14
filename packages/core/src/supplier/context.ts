import { schema, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import type { Actor, CompanySeat } from "../authz/actor";
import type { CompanyPermission } from "../authz/catalogue";

// The supplier workspace (Stage 8) works on one supplier company: the first company the person belongs to whose kind
// is supplier or both. Pages call supplierOf() and check permissions with the seat; core functions take the
// organisation id and check `can()` themselves where they change something.

export interface SupplierContext {
  organisationId: string;
  seat: CompanySeat;
  legalName: string;
  tradeName: string;
  slug: string | null;
  city: string | null;
  verification: string;
}

export async function supplierOf(db: Executor, actor: Actor): Promise<SupplierContext | null> {
  const entry = [...actor.companies.entries()].find(([, s]) => s.kind === "supplier" || s.kind === "both");
  if (!entry) return null;
  const [organisationId, seat] = entry;
  const [row] = await db
    .select({ org: schema.organisations, profile: schema.companyProfiles })
    .from(schema.organisations)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
    .where(eq(schema.organisations.id, organisationId));
  if (!row) return null;
  return {
    organisationId,
    seat,
    legalName: row.org.legalName,
    tradeName: row.profile?.tradeName ?? row.org.legalName,
    slug: row.profile?.slug ?? null,
    city: row.profile?.city ?? null,
    verification: row.org.verification,
  };
}

export const seatCan = (s: SupplierContext, p: CompanyPermission) => s.seat.permissions.has(p);
