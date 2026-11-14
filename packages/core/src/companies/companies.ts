import { schema, type Executor } from "@h2india/db";
import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { DEFAULT_ROLE } from "../authz/catalogue";
import { getDb } from "../db";
import { gstinProvider, GstinProviderUnavailableError, type GstinRecord } from "./adapters/gstin";
import { findRegistered } from "./check";
import { isValidGstin, normaliseGstin, panOf, stateOf } from "./gstin";
import { enqueueGstinCheck } from "./jobs";

// Companies (step 3.3): find one to join, or create one. One company per GSTIN and per PAN.

const { organisations: o, organisationGstins: g, memberships: m, companyProfiles: cp } = schema;

export class CompanyError extends Error {
  constructor(
    readonly code:
      | "INVALID_GSTIN"
      | "ALREADY_REGISTERED"
      | "GSTIN_NOT_FOUND"
      | "SUPPLIER_NEEDS_ACTIVE_GSTIN"
      | "NAME_REQUIRED"
      | "MIXED_PANS",
    message: string,
    readonly organisationId?: string,
  ) {
    super(message);
  }
}

export interface CompanyMatch {
  id: string;
  legalName: string;
  gstin: string | null;
  place: string | null;
  members: number;
}

function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Join step 2: companies whose name contains the text, or whose GSTIN starts with it. At most 5. */
export async function searchCompanies(ex: Executor, query: string): Promise<CompanyMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const gq = normaliseGstin(q);
  const rows = await ex
    .select({
      id: o.id,
      legalName: o.legalName,
      gstin: sql<string | null>`min(${g.gstin})`,
      place: sql<string | null>`min(${g.place})`,
      members: sql<number>`(select count(*)::int from ${m} where ${m.organisationId} = ${o.id})`,
    })
    .from(o)
    .leftJoin(g, eq(g.organisationId, o.id))
    .where(
      and(
        isNull(o.deletedAt),
        // Pre-seeded profiles nobody has claimed have no admin to approve a join request (step 6.7 claims them).
        sql`not exists (select 1 from ${cp} where ${cp.organisationId} = ${o.id} and ${cp.claimStatus} = 'Unclaimed')`,
        or(ilike(o.legalName, `%${likeEscape(q)}%`), ilike(g.gstin, `${likeEscape(gq)}%`)),
      ),
    )
    .groupBy(o.id)
    .orderBy(o.legalName)
    .limit(5);
  return rows;
}

export interface CreateCompany {
  userId: string;
  kind: "buyer" | "supplier";
  /** The GSTINs to add (state 7 can add several under one PAN); empty for "no GSTIN yet". */
  gstins: string[];
  /** Required when the GST portal cannot give the legal name. */
  name?: string;
  context?: RequestContext;
}

interface Checked {
  gstin: string;
  record: GstinRecord | null;
  pending: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e.code === "23505" || e.cause?.code === "23505";
}

/** Join step 4: creates the company with its GSTINs and makes the person its owner. */
export async function createCompany(input: CreateCompany): Promise<{ organisationId: string; legalName: string }> {
  const db = getDb();
  const gstins = [...new Set(input.gstins.map(normaliseGstin))];
  if (gstins.some((x) => !isValidGstin(x))) throw new CompanyError("INVALID_GSTIN", "A GSTIN is not valid");
  const pans = new Set(gstins.map(panOf));
  if (pans.size > 1) throw new CompanyError("MIXED_PANS", "All GSTINs of a company share one PAN");

  for (const x of gstins) {
    const found = await findRegistered(db, x);
    if (found) throw new CompanyError("ALREADY_REGISTERED", `${found.name} is already on H2 India`, found.id);
  }

  // Check every GSTIN on the portal again here; the page's answer is never trusted.
  const provider = gstinProvider();
  const checked: Checked[] = [];
  for (const x of gstins) {
    try {
      checked.push({ gstin: x, record: await provider.lookup(x), pending: false });
    } catch (error) {
      if (!(error instanceof GstinProviderUnavailableError)) throw error;
      checked.push({ gstin: x, record: null, pending: true });
    }
  }
  if (checked.some((c) => !c.pending && !c.record)) {
    throw new CompanyError("GSTIN_NOT_FOUND", "A GSTIN is not on the GST portal");
  }
  const active = checked.filter((c) => c.record?.status === "Active");
  if (input.kind === "supplier" && checked.some((c) => c.record && c.record.status !== "Active")) {
    throw new CompanyError("SUPPLIER_NEEDS_ACTIVE_GSTIN", "Suppliers need an active GSTIN");
  }
  const legalName = (active[0]?.record?.legalName ?? input.name ?? "").trim();
  if (!legalName) throw new CompanyError("NAME_REQUIRED", "Enter the company name");
  const verification = active.length > 0 ? "GST verified" : checked.some((c) => c.pending) ? "Pending" : "Unverified";
  const first = active[0]?.record ?? null;

  let organisationId = "";
  try {
    await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(o)
        .values({
          kind: input.kind,
          legalName,
          pan: gstins[0] ? panOf(gstins[0]) : null,
          state: gstins[0] ? stateOf(gstins[0]) : null,
          registeredAddress: first?.address ?? null,
          verification,
          createdBy: input.userId,
        })
        .returning({ id: o.id });
      if (!org) throw new Error("organisation insert returned nothing");
      organisationId = org.id;
      for (const [i, c] of checked.entries()) {
        await tx.insert(g).values({
          organisationId,
          isDefault: i === 0,
          gstin: c.gstin,
          stateCode: c.gstin.slice(0, 2),
          place: c.record ? `${c.record.city}, ${stateOf(c.gstin)}` : stateOf(c.gstin),
          portalStatus: c.pending ? "Pending" : (c.record?.status ?? "Pending"),
          legalName: c.record?.legalName ?? null,
          checkedAt: c.pending ? null : new Date(),
        });
      }
      await tx.insert(m).values({ organisationId, userId: input.userId, role: DEFAULT_ROLE.creator });
      await audit(tx, {
        actorId: input.userId,
        action: "organisation.create",
        resourceType: "organisation",
        resourceId: organisationId,
        companyId: organisationId,
        after: { kind: input.kind, legalName, gstins, verification },
        context: input.context,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = gstins[0] ? await findRegistered(db, gstins[0]) : null;
      throw new CompanyError("ALREADY_REGISTERED", "This company is already on H2 India", again?.id);
    }
    throw error;
  }

  for (const c of checked.filter((x) => x.pending)) await enqueueGstinCheck(c.gstin);
  return { organisationId, legalName };
}

/** The companies a person belongs to, newest first. */
export async function membershipsOf(ex: Executor, userId: string) {
  return ex
    .select({ organisationId: m.organisationId, role: m.role, legalName: o.legalName, kind: o.kind })
    .from(m)
    .innerJoin(o, eq(o.id, m.organisationId))
    .where(and(eq(m.userId, userId), isNull(o.deletedAt)))
    .orderBy(sql`${m.createdAt} desc`);
}
