import { schema, type Database, type Executor, type ReceivingContact } from "@h2india/db";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { enqueueGstinCheck } from "../companies/jobs";
import { isValidGstin, normaliseGstin, organisationFieldsForGstin, stateOf } from "../companies/gstin";

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
    // The company's GSTIN only (A189): retired ones stay for history and aren't listed.
    db
      .select()
      .from(g)
      .where(and(eq(g.organisationId, organisationId), isNull(g.retiredAt)))
      .orderBy(asc(g.createdAt)),
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

// One GSTIN per company (founder QC, 17 Nov 2026, A189). A company adds its GSTIN once (Join usually does); while it is
// still being checked the company admin may replace it; once verified (portal status Active) it is locked and only an
// H2 Economy operator with verification.edit can change it, with a reason. A replaced GSTIN is retired, not deleted, so
// quotes and orders issued under it keep showing it. The database allows one unretired GSTIN per company.

const live = (organisationId: string) => and(eq(g.organisationId, organisationId), isNull(g.retiredAt));

/** The company's GSTIN, or null before it has one. */
export async function companyGstin(db: Executor, organisationId: string) {
  const [row] = await db.select().from(g).where(live(organisationId));
  return row ?? null;
}

async function checkNewGstin(db: Executor, value: string) {
  const gstin = normaliseGstin(value);
  if (!isValidGstin(gstin)) throw new BuyerSettingsError("A GSTIN has 15 characters, like 27AAKCG5521M1Z3");
  const [taken] = await db.select({ id: g.id, retiredAt: g.retiredAt }).from(g).where(eq(g.gstin, gstin));
  if (taken) throw new BuyerSettingsError("This GSTIN is already on H2 Economy");
  return gstin;
}

/** Retire the current GSTIN and put the new one in its place, in one transaction; sites bill to the new one. */
async function swapGstin(
  db: Database,
  organisationId: string,
  current: typeof g.$inferSelect | null,
  input: { gstin: string; place?: string },
  log: { actorId: string | null; action: string; reason?: string; context?: RequestContext },
) {
  const row = await db.transaction(async (tx) => {
    if (current) {
      await tx.update(g).set({ retiredAt: new Date(), isDefault: false }).where(eq(g.id, current.id));
      await tx.update(ds).set({ gstinId: null }).where(eq(ds.gstinId, current.id));
    }
    const [added] = await tx
      .insert(g)
      .values({
        organisationId,
        gstin: input.gstin,
        stateCode: input.gstin.slice(0, 2),
        place: input.place?.trim() || stateOf(input.gstin),
        isDefault: true,
      })
      .returning({ id: g.id });
    // The state and PAN are part of the GSTIN, so the company record follows it (a supplier who joined without a
    // GSTIN has no state until now, and the onboarding checklist needs one). The portal check fills the address.
    const [org] = await tx
      .select({
        state: schema.organisations.state,
        pan: schema.organisations.pan,
        legalName: schema.organisations.legalName,
        registeredAddress: schema.organisations.registeredAddress,
      })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, organisationId));
    const fields = org ? organisationFieldsForGstin(org, input.gstin) : {};
    if (Object.keys(fields).length > 0)
      await tx.update(schema.organisations).set(fields).where(eq(schema.organisations.id, organisationId));
    await audit(tx, {
      actorId: log.actorId,
      action: log.action,
      resourceType: "organisation_gstin",
      resourceId: added?.id ?? "",
      companyId: organisationId,
      before: current ? { gstin: current.gstin, status: current.portalStatus } : null,
      after: { gstin: input.gstin, ...fields },
      reason: log.reason ?? null,
      context: log.context,
    });
    return added;
  });
  await enqueueGstinCheck(input.gstin);
  return row;
}

/** Add the company's GSTIN (580:8), when it has none yet. Checked in the background through the GSTIN adapter (3.3). */
export async function addGstin(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { gstin: string; place?: string },
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  if (await companyGstin(db, organisationId))
    throw new BuyerSettingsError(
      "A company has one GSTIN. Replace it while it's being checked, or ask H2 Economy to change a verified one.",
    );
  const gstin = await checkNewGstin(db, input.gstin);
  return swapGstin(
    db,
    organisationId,
    null,
    { gstin, place: input.place },
    {
      actorId: actor.userId,
      action: "gstin.added",
      context,
    },
  );
}

/** Correct the company's GSTIN while it is still being checked (not verified yet). */
export async function replaceGstin(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { gstin: string; place?: string },
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const current = await companyGstin(db, organisationId);
  if (current?.portalStatus === "Active")
    throw new BuyerSettingsError("Your GSTIN is verified and locked. To change it, contact H2 Economy.");
  const gstin = await checkNewGstin(db, input.gstin);
  return swapGstin(
    db,
    organisationId,
    current,
    { gstin, place: input.place },
    {
      actorId: actor.userId,
      action: "gstin.replaced",
      context,
    },
  );
}

/**
 * An operator changes a company's GSTIN, verified or not (verification.edit), with a reason (A189). The old one is
 * retired. Badges aren't touched here; verification staff review them as usual.
 */
export async function changeGstinByOperator(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { gstin: string; place?: string; reason: string },
  context?: RequestContext,
) {
  if (!actor.userId || !actor.operator.has("verification.edit")) throw new BuyerSettingsError("Not allowed");
  const reason = input.reason.trim();
  if (reason.length < 5) throw new BuyerSettingsError("Say why the GSTIN is changing");
  const [org] = await db
    .select({ id: schema.organisations.id })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  if (!org) throw new BuyerSettingsError("No such company");
  const current = await companyGstin(db, organisationId);
  const gstin = await checkNewGstin(db, input.gstin);
  return swapGstin(
    db,
    organisationId,
    current,
    { gstin, place: input.place },
    {
      actorId: actor.userId,
      action: "gstin.changed_by_operator",
      reason,
      context,
    },
  );
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
      .where(and(eq(g.id, input.gstinId), eq(g.organisationId, organisationId), isNull(g.retiredAt)));
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
