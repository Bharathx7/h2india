import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import type { RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { notify } from "../notify/notify";
import { supplierCatalogueTeam } from "../products/editor";
import { PRODUCT_STATUSES, PRODUCT_TRANSITIONS } from "../products/rules";
import { queueIndexChange } from "../search/outbox";
import { RFQ_STATUSES } from "../rfq/transitions";
import { changeStatus } from "../status";

// Back-office lists (founder QC, 17 Nov 2026): every company, every product and every RFQ, searched and paged in the
// database. Before, companies could only be reached through a person, and operators saw products and RFQs only while
// they waited in a queue. Reads only, except an operator pausing, resuming or taking down a listing.

const o = schema.organisations;
const p = schema.products;
const r = schema.rfqs;

type Page = { limit?: number; offset?: number };

// Inside a raw subquery Drizzle prints a column without its table, so it would bind to the subquery's own table
// (CLAUDE.md, Buyer workspace): outer columns are written out in full here.
const nameOf = (orgColumn: string) =>
  sql<string>`(select coalesce(cp.trade_name, y.legal_name) from core.organisations y left join core.company_profiles cp on cp.organisation_id = y.id where y.id = ${sql.raw(orgColumn)})`;
const nameLike = (orgColumn: string, like: string) =>
  sql`exists (select 1 from core.organisations y left join core.company_profiles cp on cp.organisation_id = y.id where y.id = ${sql.raw(orgColumn)} and (y.legal_name ilike ${like} or cp.trade_name ilike ${like}))`;

export async function listCompanies(
  db: Executor,
  actor: Actor,
  opts: { q?: string; kind?: "buyer" | "supplier"; status?: "verified" | "suspended" } & Page = {},
) {
  assertCan(actor, "users.view");
  const conds: SQL[] = [];
  if (opts.q) {
    const like = `%${opts.q}%`;
    const match = or(
      ilike(o.legalName, like),
      sql`exists (select 1 from core.company_profiles cp where cp.organisation_id = core.organisations.id and cp.trade_name ilike ${like})`,
      sql`exists (select 1 from core.organisation_gstins g where g.organisation_id = core.organisations.id and g.retired_at is null and g.gstin ilike ${like})`,
    );
    if (match) conds.push(match);
  }
  if (opts.kind) conds.push(sql`${o.kind} in (${opts.kind}, 'both')`);
  if (opts.status === "verified") conds.push(eq(o.verification, "Verified"));
  if (opts.status === "suspended") conds.push(sql`${o.suspendedAt} is not null`);
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: o.id,
        legalName: o.legalName,
        tradeName: sql<
          string | null
        >`(select cp.trade_name from core.company_profiles cp where cp.organisation_id = core.organisations.id)`,
        kind: o.kind,
        verification: o.verification,
        suspendedAt: o.suspendedAt,
        createdAt: o.createdAt,
        gstin: sql<
          string | null
        >`(select g.gstin from core.organisation_gstins g where g.organisation_id = core.organisations.id and g.retired_at is null limit 1)`,
        people: sql<number>`(select count(*)::int from core.memberships x where x.organisation_id = core.organisations.id)`,
        liveProducts: sql<number>`(select count(*)::int from core.products x where x.organisation_id = core.organisations.id and x.status = 'Live' and x.deleted_at is null)`,
      })
      .from(o)
      .where(where)
      .orderBy(desc(o.createdAt))
      .limit(opts.limit ?? 25)
      .offset(opts.offset ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(o)
      .where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export { PRODUCT_STATUSES as PRODUCT_LIST_STATUSES } from "../products/rules";

export async function listAllProducts(db: Executor, actor: Actor, opts: { q?: string; status?: string } & Page = {}) {
  assertCan(actor, "queues.view");
  const conds: SQL[] = [isNull(p.deletedAt)];
  if (opts.q) {
    const like = `%${opts.q}%`;
    const match = or(ilike(p.name, like), ilike(p.model, like), nameLike("core.products.organisation_id", like));
    if (match) conds.push(match);
  }
  if (opts.status && (PRODUCT_STATUSES as readonly string[]).includes(opts.status))
    conds.push(eq(p.status, opts.status));
  const where = and(...conds);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: p.id,
        slug: p.slug,
        name: p.name,
        model: p.model,
        status: p.status,
        sample: p.sample,
        updatedAt: p.updatedAt,
        organisationId: p.organisationId,
        supplier: nameOf("core.products.organisation_id"),
        category: sql<string>`(select c.label from core.catalogue_categories c where c.id = core.products.category_id)`,
      })
      .from(p)
      .where(where)
      .orderBy(desc(p.updatedAt))
      .limit(opts.limit ?? 25)
      .offset(opts.offset ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(p)
      .where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export class ListingAdminError extends Error {}

/**
 * An operator pauses a live listing, resumes one an operator paused, or takes it down for good (Archived), with a
 * reason the supplier sees (queues.edit). Goes through changeStatus (history and audit) and leaves search at once.
 */
export async function setListingByOperator(
  db: Database,
  actor: Actor,
  input: { productId: string; to: "Paused" | "Live" | "Archived"; reason: string; context?: RequestContext },
) {
  assertCan(actor, "queues.edit");
  const reason = input.reason.trim();
  if (!reason) throw new ListingAdminError("Say why, so the supplier knows");
  const [row] = await db
    .select()
    .from(p)
    .where(and(eq(p.id, input.productId), isNull(p.deletedAt)));
  if (!row) throw new ListingAdminError("No such product");
  const allowed = (PRODUCT_TRANSITIONS as Record<string, readonly string[]>)[row.status] ?? [];
  if (!allowed.includes(input.to) || (input.to === "Live" && row.status !== "Paused"))
    throw new ListingAdminError(`A ${row.status.toLowerCase()} listing can't be ${input.to.toLowerCase()} here`);
  await changeStatus(db, {
    table: p,
    entityType: "product",
    id: row.id,
    from: row.status,
    to: input.to,
    actorId: actor.userId,
    companyId: row.organisationId,
    reason: `By H2 Economy: ${reason}`,
    transitions: PRODUCT_TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await queueIndexChange(tx, "products", [row.id]);
    },
  });
  const words = { Paused: "paused", Live: "live again", Archived: "taken down" }[input.to];
  for (const person of await supplierCatalogueTeam(db, row.organisationId))
    await notify({
      event: `listing.${input.to.toLowerCase()}_by_operator`,
      topic: "company.verification",
      userId: person.id,
      scope: row.organisationId,
      inApp: {
        category: "account",
        icon: input.to === "Live" ? "play" : "pause",
        title: `H2 Economy: ${row.name} is ${words}`,
        body: reason,
        href: `/supplier/products/${row.id}`,
      },
    }).catch((error: unknown) => {
      console.error("listing notice failed", error);
    });
}

export const RFQ_LIST_STATUSES = ["In moderation", "Sent", "Quotes received", "Awarded", "Closed", "Returned", "Draft"];

export async function listAllRfqs(db: Executor, actor: Actor, opts: { q?: string; status?: string } & Page = {}) {
  assertCan(actor, "queues.view");
  const conds: SQL[] = [isNull(r.deletedAt)];
  if (opts.q) {
    const like = `%${opts.q}%`;
    const match = or(ilike(r.reference, like), ilike(r.title, like), nameLike("core.rfqs.organisation_id", like));
    if (match) conds.push(match);
  }
  if (opts.status && (RFQ_STATUSES as readonly string[]).includes(opts.status)) conds.push(eq(r.status, opts.status));
  const where = and(...conds);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: r.id,
        reference: r.reference,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
        buyer: nameOf("core.rfqs.organisation_id"),
        suppliers: sql<number>`(select count(*)::int from core.rfq_suppliers s where s.rfq_id = core.rfqs.id)`,
        quoted: sql<number>`(select count(*)::int from core.rfq_suppliers s where s.rfq_id = core.rfqs.id and s.status not in ('Sent', 'Viewed'))`,
      })
      .from(r)
      .where(where)
      .orderBy(desc(r.createdAt))
      .limit(opts.limit ?? 25)
      .offset(opts.offset ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(r)
      .where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}
