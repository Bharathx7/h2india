import { schema, type Executor } from "@h2india/db";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";

// The RFQ moderation queue (629:1148) and one RFQ under review (632:1138), step 9.4. The seriousness checklist is
// worked out from the records: what the buyer gave, whether they are verified, and whether it repeats an open RFQ.

export interface SeriousnessCheck {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
  /** The short flag on the queue row when it fails. */
  flag: string;
}

export function seriousness(f: {
  companyNamed: boolean;
  siteGiven: boolean;
  neededByGiven: boolean;
  itemSpecified: boolean;
  itemText: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  duplicateOf: string | null;
}): SeriousnessCheck[] {
  return [
    { key: "company", label: "Company or institution named", ok: f.companyNamed, flag: "no company" },
    { key: "site", label: "Delivery site given", ok: f.siteGiven, flag: "no site" },
    { key: "date", label: "Needed-by date given", ok: f.neededByGiven, flag: "no date" },
    {
      key: "spec",
      label: "Item described with size or spec",
      ok: f.itemSpecified,
      detail: f.itemSpecified ? undefined : `Only "${f.itemText}"`,
      flag: "little detail",
    },
    {
      key: "verified",
      label: "Email and mobile verified",
      ok: f.emailVerified && f.mobileVerified,
      detail: f.emailVerified && !f.mobileVerified ? "Mobile not verified" : undefined,
      flag: "not verified",
    },
    {
      key: "duplicate",
      label: "Not a duplicate of a recent RFQ",
      ok: f.duplicateOf === null,
      detail: f.duplicateOf ? `Same as ${f.duplicateOf}` : undefined,
      flag: "possible duplicate",
    },
  ];
}

async function factsFor(db: Executor, rfqIds: string[]) {
  if (!rfqIds.length) return new Map<string, SeriousnessCheck[]>();
  const r = schema.rfqs;
  const rows = await db
    .select({
      id: r.id,
      title: r.title,
      organisationId: r.organisationId,
      siteId: r.deliverySiteId,
      requiredBy: r.requiredBy,
      requirements: r.requirements,
      legalName: schema.organisations.legalName,
      emailVerified: schema.users.emailVerified,
      mobileVerifiedAt: schema.users.mobileVerifiedAt,
      specs: sql<number>`(select count(*)::int from core.rfq_items i, jsonb_object_keys(i.specs) k where i.rfq_id = ${r.id})`,
      duplicate: sql<string | null>`(select o.reference from core.rfqs o where o.organisation_id = ${r.organisationId}
        and o.id <> ${r.id} and lower(o.title) = lower(${r.title}) and o.status <> 'Closed' and o.deleted_at is null
        order by o.created_at limit 1)`,
    })
    .from(r)
    .innerJoin(schema.organisations, eq(schema.organisations.id, r.organisationId))
    .innerJoin(schema.users, eq(schema.users.id, r.createdBy))
    .where(inArray(r.id, rfqIds));
  return new Map(
    rows.map((x) => [
      x.id,
      seriousness({
        companyNamed: Boolean(x.legalName.trim()),
        siteGiven: x.siteId !== null,
        neededByGiven: x.requiredBy !== null,
        itemSpecified: x.specs > 0 || (x.requirements?.trim().length ?? 0) >= 20,
        itemText: x.title,
        emailVerified: x.emailVerified,
        mobileVerified: x.mobileVerifiedAt !== null,
        duplicateOf: x.duplicate,
      }),
    ]),
  );
}

/** RFQs waiting for moderation, oldest first. */
export async function moderationQueue(
  db: Executor,
  actor: Actor,
  opts: { view?: "all" | "mine" | "unassigned"; q?: string } = {},
) {
  assertCan(actor, "queues.view");
  const r = schema.rfqs;
  const conds = [eq(r.status, "In moderation")];
  if (opts.view === "mine" && actor.userId) conds.push(eq(r.moderatorId, actor.userId));
  if (opts.view === "unassigned") conds.push(sql`${r.moderatorId} is null`);
  if (opts.q)
    conds.push(
      sql`(${r.reference} ilike ${`%${opts.q}%`} or ${r.title} ilike ${`%${opts.q}%`} or exists (select 1 from core.organisations o where o.id = ${r.organisationId} and o.legal_name ilike ${`%${opts.q}%`}))`,
    );
  const rows = await db
    .select({
      rfq: r,
      company: schema.organisations.legalName,
      submitter: schema.users.name,
      moderator: sql<string | null>`(select name from core.users m where m.id = ${r.moderatorId})`,
      files: sql<number>`coalesce(array_length(${r.attachments}, 1), 0)`,
    })
    .from(r)
    .innerJoin(schema.organisations, eq(schema.organisations.id, r.organisationId))
    .innerJoin(schema.users, eq(schema.users.id, r.createdBy))
    .where(and(...conds))
    .orderBy(asc(r.submittedAt));
  const checks = await factsFor(
    db,
    rows.map((x) => x.rfq.id),
  );
  return rows.map((x) => ({ ...x, checks: checks.get(x.rfq.id) ?? [] }));
}

/** One RFQ for the moderation screen: what the buyer sent, checks, decisions and the audit trail. */
export async function moderationDetail(db: Executor, actor: Actor, rfqId: string) {
  assertCan(actor, "queues.view");
  const r = schema.rfqs;
  const [row] = await db
    .select({
      rfq: r,
      company: schema.organisations.legalName,
      submitter: schema.users.name,
      email: schema.users.email,
      site: sql<
        string | null
      >`(select concat_ws(', ', d.name, d.address, d.city, d.state) from core.delivery_sites d where d.id = ${r.deliverySiteId})`,
      category: sql<string | null>`(select label from core.catalogue_categories c where c.id = ${r.categoryId})`,
      moderator: sql<string | null>`(select name from core.users m where m.id = ${r.moderatorId})`,
    })
    .from(r)
    .innerJoin(schema.organisations, eq(schema.organisations.id, r.organisationId))
    .innerJoin(schema.users, eq(schema.users.id, r.createdBy))
    .where(eq(r.id, rfqId));
  if (!row) return null;
  const [items, suppliers, decisions, trail, checks, neighbours] = await Promise.all([
    db.select().from(schema.rfqItems).where(eq(schema.rfqItems.rfqId, rfqId)).orderBy(asc(schema.rfqItems.position)),
    db
      .select({ name: sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${schema.organisations.legalName})` })
      .from(schema.rfqSuppliers)
      .innerJoin(schema.organisations, eq(schema.organisations.id, schema.rfqSuppliers.organisationId))
      .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.rfqSuppliers.organisationId))
      .where(eq(schema.rfqSuppliers.rfqId, rfqId)),
    db
      .select()
      .from(schema.rfqModerationDecisions)
      .where(eq(schema.rfqModerationDecisions.rfqId, rfqId))
      .orderBy(desc(schema.rfqModerationDecisions.at)),
    db
      .select({
        at: schema.statusHistory.at,
        to: schema.statusHistory.toStatus,
        reason: schema.statusHistory.reason,
        actor: sql<string | null>`(select name from core.users u where u.id = ${schema.statusHistory.actorId})`,
      })
      .from(schema.statusHistory)
      .where(and(eq(schema.statusHistory.entityType, "rfq"), eq(schema.statusHistory.entityId, rfqId)))
      .orderBy(desc(schema.statusHistory.at)),
    factsFor(db, [rfqId]),
    db
      .select({ id: r.id })
      .from(r)
      .where(and(eq(r.status, "In moderation"), ne(r.id, rfqId)))
      .orderBy(asc(r.submittedAt)),
  ]);
  return {
    ...row,
    items,
    suppliers,
    decisions,
    trail,
    checks: checks.get(rfqId) ?? [],
    next: neighbours[0]?.id ?? null,
  };
}
