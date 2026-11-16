import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { looksLikeEmail } from "../sign-in/rules";
import { inScope, scopeFor } from "../authz/scope";
import { CompanyError, createCompany } from "../companies/companies";
import { sendInvitation, TeamError } from "../supplier/team";

// Company detail and Add a supplier (admin QC, 16 Nov 2026). Operators with users.view open any company and see,
// in one place, its details, GSTINs, team and invitations, listings, RFQs and quotes, badges, the latest supplier
// review and recent activity. Operators with users.edit add a supplier for its owner: the company is created exactly
// as Join creates it (the GSTIN is checked, duplicates on GSTIN and PAN are refused) and the owner is invited as
// Admin. Nothing makes it Verified: badges still need evidence (grantBadge).

const o = schema.organisations;

export class CompanyAdminError extends Error {
  constructor(
    message: string,
    readonly errors: Record<string, string> = {},
    readonly existingId?: string,
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Everything about one company for the admin Company detail page, or null. */
export async function companyDetail(db: Executor, actor: Actor, organisationId: string) {
  assertCan(actor, "users.view");
  if (!UUID.test(organisationId)) return null;
  const scope = scopeFor(actor, { operatorArea: "users" });
  const [org] = await db
    .select()
    .from(o)
    .where(and(eq(o.id, organisationId), inScope(scope, o.id)));
  if (!org) return null;
  const g = schema.organisationGstins;
  const m = schema.memberships;
  const inv = schema.invitations;
  const p = schema.products;
  const b = schema.supplierBadges;
  const al = schema.auditLog;
  const n = sql<number>`count(*)::int`;
  const [profile, gstins, team, invitations, listings, recentListings, rfqs, quotes, badges, review, activity] =
    await Promise.all([
      db
        .select({
          slug: schema.companyProfiles.slug,
          tradeName: schema.companyProfiles.tradeName,
          city: schema.companyProfiles.city,
          website: schema.companyProfiles.website,
          claimStatus: schema.companyProfiles.claimStatus,
        })
        .from(schema.companyProfiles)
        .where(eq(schema.companyProfiles.organisationId, organisationId))
        .then((r) => r[0] ?? null),
      db
        .select({ id: g.id, gstin: g.gstin, place: g.place, portalStatus: g.portalStatus, isDefault: g.isDefault })
        .from(g)
        .where(and(inScope(scope, g.organisationId), eq(g.organisationId, organisationId)))
        .orderBy(desc(g.isDefault), g.gstin),
      db
        .select({
          userId: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: m.role,
          since: m.createdAt,
          suspendedAt: schema.users.suspendedAt,
        })
        .from(m)
        .innerJoin(schema.users, eq(schema.users.id, m.userId))
        .where(and(inScope(scope, m.organisationId), eq(m.organisationId, organisationId)))
        .orderBy(m.createdAt),
      db
        .select({ id: inv.id, email: inv.email, role: inv.role, expiresAt: inv.expiresAt, createdAt: inv.createdAt })
        .from(inv)
        .where(
          and(
            inScope(scope, inv.organisationId),
            eq(inv.organisationId, organisationId),
            isNull(inv.acceptedAt),
            isNull(inv.revokedAt),
          ),
        )
        .orderBy(desc(inv.createdAt)),
      db
        .select({ status: p.status, n })
        .from(p)
        .where(and(inScope(scope, p.organisationId), eq(p.organisationId, organisationId), isNull(p.deletedAt)))
        .groupBy(p.status),
      db
        .select({ id: p.id, name: p.name, status: p.status, slug: p.slug, updatedAt: p.updatedAt })
        .from(p)
        .where(and(inScope(scope, p.organisationId), eq(p.organisationId, organisationId), isNull(p.deletedAt)))
        .orderBy(desc(p.updatedAt))
        .limit(8),
      db
        .select({ status: schema.rfqs.status, n })
        .from(schema.rfqs)
        .where(
          and(
            inScope(scope, schema.rfqs.organisationId),
            eq(schema.rfqs.organisationId, organisationId),
            isNull(schema.rfqs.deletedAt),
          ),
        )
        .groupBy(schema.rfqs.status),
      db
        .select({ status: schema.quotes.status, n })
        .from(schema.quotes)
        .where(and(inScope(scope, schema.quotes.organisationId), eq(schema.quotes.organisationId, organisationId)))
        .groupBy(schema.quotes.status),
      db
        .select({ kind: b.kind, status: b.status, grantedAt: b.grantedAt })
        .from(b)
        .where(and(inScope(scope, b.organisationId), eq(b.organisationId, organisationId)))
        .orderBy(b.kind),
      db
        .select({
          status: schema.supplierReviews.status,
          submittedAt: schema.supplierReviews.submittedAt,
        })
        .from(schema.supplierReviews)
        .where(
          and(
            inScope(scope, schema.supplierReviews.organisationId),
            eq(schema.supplierReviews.organisationId, organisationId),
          ),
        )
        .orderBy(desc(schema.supplierReviews.submittedAt))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ at: al.at, action: al.action, actorId: al.actorId, resourceType: al.resourceType })
        .from(al)
        .where(or(eq(al.companyId, organisationId), eq(al.resourceId, organisationId)))
        .orderBy(desc(al.at))
        .limit(20),
    ]);
  return { org, profile, gstins, team, invitations, listings, recentListings, rfqs, quotes, badges, review, activity };
}

export interface AddSupplierInput {
  gstin: string;
  /** Needed only when the GST records give no legal name. */
  name?: string;
  ownerEmail: string;
}

/** Field problems before anything is checked with GST records, or {}. Pure, so the form shows the same messages. */
export function addSupplierProblems(input: AddSupplierInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(input.gstin.trim().toUpperCase()))
    e.gstin = "A GSTIN has 15 characters, like 27AAKCG5521M1Z3";
  if (!looksLikeEmail(input.ownerEmail)) e.ownerEmail = "Enter the owner's full email";
  return e;
}

const COMPANY_MESSAGES: Record<string, { field: string; text: string }> = {
  INVALID_GSTIN: { field: "gstin", text: "This GSTIN isn't valid" },
  ALREADY_REGISTERED: { field: "gstin", text: "This company is already on H2 Economy" },
  GSTIN_NOT_FOUND: { field: "gstin", text: "This GSTIN isn't on the GST portal" },
  SUPPLIER_NEEDS_ACTIVE_GSTIN: { field: "gstin", text: "Suppliers need an active GSTIN" },
  NAME_REQUIRED: { field: "name", text: "GST records give no name: enter the company's legal name" },
};

/**
 * Add a supplier for its owner (users.edit). Creates the company as Join does, without making the operator a member,
 * then invites the owner as Admin. Returns the new company's id.
 */
export async function addSupplierByOperator(
  db: Database,
  actor: Actor,
  input: AddSupplierInput,
  context?: RequestContext,
): Promise<{ organisationId: string; legalName: string }> {
  assertCan(actor, "users.edit");
  if (!actor.userId) throw new CompanyAdminError("Sign in again");
  const errors = addSupplierProblems(input);
  if (Object.keys(errors).length) throw new CompanyAdminError("Check the highlighted fields", errors);
  let made: { organisationId: string; legalName: string };
  try {
    made = await createCompany({
      userId: actor.userId,
      kind: "supplier",
      gstins: [input.gstin],
      name: input.name?.trim() || undefined,
      context,
      byOperator: true,
    });
  } catch (error) {
    if (error instanceof CompanyError) {
      const known = COMPANY_MESSAGES[error.code];
      const text = known?.text ?? error.message;
      throw new CompanyAdminError(text, { [known?.field ?? "gstin"]: text }, error.organisationId);
    }
    throw error;
  }
  try {
    await sendInvitation(db, {
      organisationId: made.organisationId,
      email: input.ownerEmail,
      role: "Admin",
      invitedBy: actor.userId,
      inviterRole: "H2 Economy team",
      context,
    });
  } catch (error) {
    // The company stays; the operator can invite again from its page.
    if (error instanceof TeamError)
      throw new CompanyAdminError(`${made.legalName} was added, but the invitation wasn't sent: ${error.message}`);
    throw error;
  }
  return made;
}
