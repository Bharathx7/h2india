import { schema, type Database, type Executor, type ReceivingContact } from "@h2india/db";
import { and, asc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { enqueueGstinCheck } from "../companies/jobs";
import { isValidGstin, normaliseGstin, panOf, stateOf } from "../companies/gstin";

// Company settings for buyers (step 9.1; 574:8 to 577:729 and their dialogs). Company profile, GSTINs and delivery
// sites, approval rules and security need company.manage (the buyer Admin); users and roles use team.manage
// (supplier/team.ts). Every change is audited. Approval rules are stored now and enforced in Stage 10.

const g = schema.organisationGstins;
const ds = schema.deliverySites;
const bs = schema.buyerSettings;

export class BuyerSettingsError extends Error {}

// ------------------------------------------------------------------------------------------------ profile

export async function companySettings(db: Executor, scope: Scope, organisationId: string) {
  const [org] = await db
    .select()
    .from(schema.organisations)
    .where(and(inScope(scope, schema.organisations.id), eq(schema.organisations.id, organisationId)));
  if (!org) return null;
  const [gstins, sites, settings, profile] = await Promise.all([
    db.select().from(g).where(eq(g.organisationId, organisationId)).orderBy(asc(g.createdAt)),
    db
      .select()
      .from(ds)
      .where(and(eq(ds.organisationId, organisationId), isNull(ds.deletedAt)))
      .orderBy(asc(ds.createdAt)),
    db
      .select()
      .from(bs)
      .where(eq(bs.organisationId, organisationId))
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(schema.companyProfiles)
      .where(eq(schema.companyProfiles.organisationId, organisationId))
      .then((r) => r[0] ?? null),
  ]);
  return { org, gstins, sites, settings, profile };
}

export interface ProfileInput {
  tradeName: string;
  type?: string;
  size?: string;
  about?: string;
}

/** Company profile (574:8): the trade name, type, size and about text suppliers see. The legal name and
 * registered office come from GST records and change only through support. */
export async function updateCompanyProfile(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: ProfileInput,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const tradeName = input.tradeName.trim();
  if (!tradeName) throw new BuyerSettingsError("Enter the trade name");
  const about = input.about?.trim() ?? "";
  if (about.length > 500) throw new BuyerSettingsError("Keep About the company to 500 characters");
  const cp = schema.companyProfiles;
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(cp).where(eq(cp.organisationId, organisationId));
    if (!before) throw new BuyerSettingsError("This company has no profile yet.");
    const after = {
      tradeName,
      types: input.type ? [input.type] : before.types,
      employees: input.size?.trim() || null,
      summary: about || null,
    };
    await tx.update(cp).set(after).where(eq(cp.organisationId, organisationId));
    await audit(tx, {
      actorId: actor.userId,
      action: "company.profile.updated",
      resourceType: "organisation",
      resourceId: organisationId,
      companyId: organisationId,
      before: {
        tradeName: before.tradeName,
        types: before.types,
        employees: before.employees,
        summary: before.summary,
      },
      after,
      context,
    });
  });
}

// ------------------------------------------------------------------------------------------------ GSTINs

/** Add a GSTIN (580:8): same PAN as the company's; checked in the background through the GSTIN adapter (3.3). */
export async function addGstin(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { gstin: string; place?: string },
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const gstin = normaliseGstin(input.gstin);
  if (!isValidGstin(gstin)) throw new BuyerSettingsError("A GSTIN has 15 characters, like 27AAKCG5521M1Z3");
  const existing = await db.select().from(g).where(eq(g.organisationId, organisationId));
  if (existing.some((x) => x.gstin === gstin)) throw new BuyerSettingsError("This GSTIN is already added");
  const first = existing[0];
  if (first && panOf(first.gstin) !== panOf(gstin))
    throw new BuyerSettingsError("This GSTIN belongs to a different PAN. Add GSTINs of your own company only.");
  const [taken] = await db.select({ id: g.id }).from(g).where(eq(g.gstin, gstin));
  if (taken) throw new BuyerSettingsError("This GSTIN belongs to another company on H2 Economy");
  const [row] = await db
    .insert(g)
    .values({
      organisationId,
      gstin,
      stateCode: gstin.slice(0, 2),
      place: input.place?.trim() || stateOf(gstin),
      isDefault: existing.length === 0,
    })
    .returning({ id: g.id });
  await audit(db, {
    actorId: actor.userId,
    action: "gstin.added",
    resourceType: "organisation_gstin",
    resourceId: row?.id ?? "",
    companyId: organisationId,
    after: { gstin },
    context,
  });
  await enqueueGstinCheck(gstin);
  return row;
}

export async function setDefaultGstin(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const [row] = await db
    .select()
    .from(g)
    .where(and(eq(g.id, id), eq(g.organisationId, organisationId)));
  if (!row) throw new BuyerSettingsError("No such GSTIN");
  if (row.portalStatus !== "Active") throw new BuyerSettingsError("Only a verified GSTIN can be the default");
  await db.transaction(async (tx) => {
    await tx.update(g).set({ isDefault: false }).where(eq(g.organisationId, organisationId));
    await tx.update(g).set({ isDefault: true }).where(eq(g.id, id));
    await audit(tx, {
      actorId: actor.userId,
      action: "gstin.default",
      resourceType: "organisation_gstin",
      resourceId: id,
      companyId: organisationId,
      context,
    });
  });
}

export async function removeGstin(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const [row] = await db
    .select()
    .from(g)
    .where(and(eq(g.id, id), eq(g.organisationId, organisationId)));
  if (!row) throw new BuyerSettingsError("No such GSTIN");
  if (row.isDefault) throw new BuyerSettingsError("Choose another default GSTIN first");
  const [used] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(ds)
    .where(and(eq(ds.gstinId, id), isNull(ds.deletedAt)));
  if ((used?.n ?? 0) > 0) throw new BuyerSettingsError("A delivery site bills to this GSTIN. Change the site first.");
  // Supplier QC: a quote was issued under it, so its orders and invoices still need it.
  const [quoted] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.quoteVersions)
    .where(eq(schema.quoteVersions.supplierGstinId, id));
  if ((quoted?.n ?? 0) > 0)
    throw new BuyerSettingsError("A quote was issued under this GSTIN, so it can't be removed.");
  // Founder QC (17 Nov 2026): orders now record the GSTIN they're invoiced or billed under.
  const [ordered] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(or(eq(schema.orders.supplierGstinId, id), eq(schema.orders.billingGstinId, id)));
  if ((ordered?.n ?? 0) > 0) throw new BuyerSettingsError("An order uses this GSTIN, so it can't be removed.");
  await db.delete(g).where(eq(g.id, id));
  await audit(db, {
    actorId: actor.userId,
    action: "gstin.removed",
    resourceType: "organisation_gstin",
    resourceId: id,
    companyId: organisationId,
    before: { gstin: row.gstin },
    context,
  });
}

// ------------------------------------------------------------------------------------------------ delivery sites

export interface SiteInput {
  name: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstinId?: string | null;
  hours?: string;
  contacts: ReceivingContact[];
  isDefault?: boolean;
}

function checkSite(input: SiteInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!input.name.trim()) e.name = "Name the site";
  if (!input.address.trim()) e.address = "Enter the address";
  if (input.pincode && !/^\d{6}$/.test(input.pincode.trim())) e.pincode = "A PIN code has 6 digits";
  for (const c of input.contacts)
    if (c.mobile && !/^(\+91)?[6-9]\d{9}$/.test(c.mobile.replace(/\s+/g, "")))
      e.contacts = "Enter a 10-digit Indian mobile number";
  return e;
}

/** Add or edit a delivery site (580:152). The first site becomes the default. */
export async function saveDeliverySite(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: SiteInput & { id?: string },
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const errors = checkSite(input);
  if (Object.keys(errors).length)
    throw Object.assign(new BuyerSettingsError(Object.values(errors)[0] ?? "Check the form"), { errors });
  if (input.gstinId) {
    const [own] = await db
      .select({ id: g.id })
      .from(g)
      .where(and(eq(g.id, input.gstinId), eq(g.organisationId, organisationId)));
    if (!own) throw new BuyerSettingsError("Choose one of your GSTINs");
  }
  const values = {
    name: input.name.trim(),
    address: input.address.trim(),
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    pincode: input.pincode?.trim() || null,
    gstinId: input.gstinId ?? null,
    hours: input.hours?.trim() || null,
    contacts: input.contacts
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), role: c.role.trim(), mobile: c.mobile.replace(/\s+/g, "") })),
  };
  return db.transaction(async (tx) => {
    const others = await tx
      .select({ id: ds.id })
      .from(ds)
      .where(and(eq(ds.organisationId, organisationId), isNull(ds.deletedAt)));
    let id = input.id ?? "";
    if (input.id) {
      const done = await tx
        .update(ds)
        .set(values)
        .where(and(eq(ds.id, input.id), eq(ds.organisationId, organisationId)))
        .returning({ id: ds.id });
      if (!done.length) throw new BuyerSettingsError("No such site");
    } else {
      const [row] = await tx
        .insert(ds)
        .values({ ...values, organisationId, isDefault: others.length === 0 })
        .returning({ id: ds.id });
      id = row?.id ?? "";
    }
    if (input.isDefault) {
      await tx
        .update(ds)
        .set({ isDefault: false })
        .where(and(eq(ds.organisationId, organisationId), ne(ds.id, id)));
      await tx.update(ds).set({ isDefault: true }).where(eq(ds.id, id));
    }
    await audit(tx, {
      actorId: actor.userId,
      action: input.id ? "delivery_site.updated" : "delivery_site.added",
      resourceType: "delivery_site",
      resourceId: id,
      companyId: organisationId,
      after: { name: values.name },
      context,
    });
    return { id };
  });
}

export async function removeDeliverySite(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const [row] = await db
    .select()
    .from(ds)
    .where(and(eq(ds.id, id), eq(ds.organisationId, organisationId), isNull(ds.deletedAt)));
  if (!row) throw new BuyerSettingsError("No such site");
  if (row.isDefault) throw new BuyerSettingsError("Make another site the default first");
  await db.update(ds).set({ deletedAt: new Date() }).where(eq(ds.id, id));
  await audit(db, {
    actorId: actor.userId,
    action: "delivery_site.removed",
    resourceType: "delivery_site",
    resourceId: id,
    companyId: organisationId,
    before: { name: row.name },
    context,
  });
}

/** The company's delivery sites, for the RFQ wizard and checkout. Company-scoped. */
export async function deliverySitesOf(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select()
    .from(ds)
    .where(and(inScope(scope, ds.organisationId), eq(ds.organisationId, organisationId), isNull(ds.deletedAt)))
    .orderBy(sql`${ds.isDefault} desc`, asc(ds.createdAt));
}

// ------------------------------------------------------------------------------------------------ approval rules

export interface ApprovalRules {
  approvalAbovePaise: bigint | null;
  approverId: string | null;
  secondApproval: boolean;
  secondAbovePaise: bigint | null;
  secondApproverId: string | null;
}

/** Approval rules (576:300). The approvers must be company members who can approve; a second approver needs a higher amount. */
export async function saveApprovalRules(
  db: Database,
  actor: Actor,
  organisationId: string,
  rules: ApprovalRules,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  if (rules.approvalAbovePaise !== null && rules.approvalAbovePaise <= 0n)
    throw new BuyerSettingsError("Enter an amount above zero");
  if (rules.approvalAbovePaise !== null && !rules.approverId) throw new BuyerSettingsError("Choose the approver");
  if (rules.secondApproval) {
    if (!rules.secondApproverId || !rules.secondAbovePaise)
      throw new BuyerSettingsError("Choose the second approver and the amount");
    if (rules.approvalAbovePaise !== null && rules.secondAbovePaise <= rules.approvalAbovePaise)
      throw new BuyerSettingsError("The second approver's amount must be higher than the first");
    if (rules.secondApproverId === rules.approverId) throw new BuyerSettingsError("Choose a different second approver");
  }
  const members = await db
    .select({ userId: schema.memberships.userId, role: schema.memberships.role })
    .from(schema.memberships)
    .where(eq(schema.memberships.organisationId, organisationId));
  for (const id of [rules.approverId, rules.secondApproval ? rules.secondApproverId : null]) {
    const m = id ? members.find((x) => x.userId === id) : null;
    if (id && (!m || !["Approver", "Admin"].includes(m.role)))
      throw new BuyerSettingsError("Approvers must be Approvers or Admins in your company");
  }
  const [before] = await db
    .select()
    .from(schema.buyerSettings)
    .where(eq(schema.buyerSettings.organisationId, organisationId));
  const values = {
    ...rules,
    secondAbovePaise: rules.secondApproval ? rules.secondAbovePaise : null,
    secondApproverId: rules.secondApproval ? rules.secondApproverId : null,
    updatedAt: new Date(),
  };
  await db
    .insert(schema.buyerSettings)
    .values({ organisationId, ...values })
    .onConflictDoUpdate({ target: schema.buyerSettings.organisationId, set: values });
  const money = (v: bigint | null | undefined) => (v === null || v === undefined ? null : v.toString());
  await audit(db, {
    actorId: actor.userId,
    action: "approval_rules.saved",
    resourceType: "buyer_settings",
    resourceId: organisationId,
    companyId: organisationId,
    before: before
      ? { above: money(before.approvalAbovePaise), approver: before.approverId, second: before.secondApproval }
      : null,
    after: {
      above: money(rules.approvalAbovePaise),
      approver: rules.approverId,
      second: rules.secondApproval,
      secondAbove: money(rules.secondAbovePaise),
    },
    context,
  });
}

export async function addDelegation(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { fromUserId: string; toUserId: string; startsOn: Date; endsOn: Date },
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  if (input.endsOn <= input.startsOn) throw new BuyerSettingsError("The end date must be after the start");
  if (input.fromUserId === input.toUserId) throw new BuyerSettingsError("Choose someone else to hand approvals to");
  const [row] = await db
    .insert(schema.approvalDelegations)
    .values({ organisationId, ...input })
    .returning({ id: schema.approvalDelegations.id });
  await audit(db, {
    actorId: actor.userId,
    action: "delegation.added",
    resourceType: "approval_delegation",
    resourceId: row?.id ?? "",
    companyId: organisationId,
    after: { from: input.fromUserId, to: input.toUserId },
    context,
  });
}

export async function endDelegation(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  await db
    .update(schema.approvalDelegations)
    .set({ endedAt: new Date() })
    .where(and(eq(schema.approvalDelegations.id, id), eq(schema.approvalDelegations.organisationId, organisationId)));
  await audit(db, {
    actorId: actor.userId,
    action: "delegation.ended",
    resourceType: "approval_delegation",
    resourceId: id,
    companyId: organisationId,
    context,
  });
}

export async function delegationsOf(db: Executor, scope: Scope, organisationId: string, now: Date = new Date()) {
  const d = schema.approvalDelegations;
  return db
    .select({
      d,
      from: sql<string>`(select name from core.users where id = ${d.fromUserId})`,
      to: sql<string>`(select name from core.users where id = ${d.toUserId})`,
    })
    .from(d)
    .where(
      and(
        inScope(scope, d.organisationId),
        eq(d.organisationId, organisationId),
        isNull(d.endedAt),
        sql`${d.endsOn} > ${now}`,
      ),
    );
}

// ------------------------------------------------------------------------------------------------ security

/** Signed in now (576:662): the company's people and their active sessions. */
export async function companySessions(db: Executor, actor: Actor, organisationId: string, now: Date = new Date()) {
  assertCan(actor, "company.manage", { organisationId });
  const s = schema.sessions;
  return db
    .select({ id: s.id, userId: s.userId, name: schema.users.name, userAgent: s.userAgent, updatedAt: s.updatedAt })
    .from(s)
    .innerJoin(
      schema.memberships,
      and(eq(schema.memberships.userId, s.userId), eq(schema.memberships.organisationId, organisationId)),
    )
    .innerJoin(schema.users, eq(schema.users.id, s.userId))
    .where(sql`${s.expiresAt} > ${now}`)
    .orderBy(sql`${s.updatedAt} desc`);
}

/** Sign someone out (a session of a company member), or everyone except the admin doing it. */
export async function signOutSessions(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { sessionId?: string; allExcept?: string },
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const members = (
    await db
      .select({ userId: schema.memberships.userId })
      .from(schema.memberships)
      .where(eq(schema.memberships.organisationId, organisationId))
  ).map((m) => m.userId);
  const s = schema.sessions;
  const targets = members.length
    ? await db.select({ id: s.id, userId: s.userId }).from(s).where(inArray(s.userId, members))
    : [];
  const doomed = targets.filter((t) => (input.sessionId ? t.id === input.sessionId : t.id !== input.allExcept));
  for (const t of doomed) await db.delete(s).where(eq(s.id, t.id));
  await audit(db, {
    actorId: actor.userId,
    action: "security.signed_out",
    resourceType: "organisation",
    resourceId: organisationId,
    companyId: organisationId,
    after: { sessions: doomed.length },
    context,
  });
  return doomed.length;
}
