import { schema, type Database } from "@h2india/db";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { monthlyIdentity } from "../ledger";
import { getSetting, setSetting } from "../settings";
import { ordersNeedingOperations } from "./flow";
import { OrderError, PILOT_ORGANISATIONS, RATE_CARDS } from "./records";
import type { RateCard } from "./fees";

// The back office for orders and money (steps 11.5 and 11.6). Operators read every company's orders only with their
// area's permission (orders.view, money.view); decisions go through the order functions, which audit them.

const o = schema.orders;

export class AdminOrderError extends OrderError {}

function need(actor: Actor, permission: string) {
  if (!actor.operator.has(permission)) throw new AdminOrderError("Not allowed");
}

const name = (side: "buyer" | "supplier") =>
  side === "buyer"
    ? sql<string>`(select coalesce(p.trade_name, x.legal_name) from core.organisations x
        left join core.company_profiles p on p.organisation_id = x.id where x.id = core.orders.buyer_organisation_id)`
    : sql<string>`(select coalesce(p.trade_name, x.legal_name) from core.organisations x
        left join core.company_profiles p on p.organisation_id = x.id where x.id = core.orders.supplier_organisation_id)`;

export type AdminOrderView = "attention" | "disputes" | "all";

/** Orders for Operations (11.5): needing attention (late answers, locked links, disputes), disputes, or all. */
/** The orders a view shows (filters shared by the list and its count). */
async function adminOrderWhere(db: Database, input: { view: AdminOrderView; q?: string }) {
  const attention = input.view === "attention" ? (await ordersNeedingOperations(db)).map((x) => x.id) : null;
  const q = input.q?.trim();
  return and(
    attention ? (attention.length ? inArray(o.id, attention) : sql`false`) : undefined,
    input.view === "disputes"
      ? sql`exists (select 1 from core.disputes d where d.order_id = core.orders.id)`
      : undefined,
    q ? or(ilike(o.reference, `%${q}%`)) : undefined,
  );
}

/** How many orders a view holds (the pages of adminOrders). */
export async function countAdminOrders(db: Database, actor: Actor, input: { view: AdminOrderView; q?: string }) {
  need(actor, "orders.view");
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(o)
    .where(await adminOrderWhere(db, input));
  return row?.n ?? 0;
}

export async function adminOrders(
  db: Database,
  actor: Actor,
  input: { view: AdminOrderView; q?: string },
  page: { limit?: number; offset?: number } = {},
) {
  need(actor, "orders.view");
  const where = await adminOrderWhere(db, input);
  return db
    .select({
      id: o.id,
      reference: o.reference,
      status: o.status,
      totalPaise: o.totalPaise,
      createdAt: o.createdAt,
      buyer: name("buyer"),
      supplier: name("supplier"),
      dispute: sql<string | null>`(select d.status from core.disputes d where d.order_id = core.orders.id
        order by d.created_at desc limit 1)`,
    })
    .from(o)
    .where(where)
    .orderBy(desc(o.createdAt))
    .limit(page.limit ?? 200)
    .offset(page.offset ?? 0);
}

/** Counts for the tabs. */
export async function adminOrderCounts(db: Database, actor: Actor) {
  need(actor, "orders.view");
  const [all] = await db.select({ n: sql<number>`count(*)::int` }).from(o);
  const [disputes] = await db
    .select({ n: sql<number>`count(distinct ${schema.disputes.orderId})::int` })
    .from(schema.disputes);
  return { attention: (await ordersNeedingOperations(db)).length, disputes: disputes?.n ?? 0, all: all?.n ?? 0 };
}

// ------------------------------------------------------------------------------------------------ money (11.6)

/** Every payment, newest first (Money · Payments). */
export async function adminPayments(db: Database, actor: Actor, page: { limit?: number; offset?: number } = {}) {
  need(actor, "money.view");
  return db
    .select({ payment: schema.payments, reference: o.reference, orderId: o.id })
    .from(schema.payments)
    .innerJoin(o, eq(o.id, schema.payments.orderId))
    .orderBy(desc(schema.payments.createdAt))
    .limit(page.limit ?? 200)
    .offset(page.offset ?? 0);
}

/** How many payments there are (the pages of adminPayments). */
export async function countAdminPayments(db: Database, actor: Actor) {
  need(actor, "money.view");
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.payments);
  return row?.n ?? 0;
}

export async function adminPayouts(db: Database, actor: Actor, page: { limit?: number; offset?: number } = {}) {
  need(actor, "money.view");
  return db
    .select({
      payout: schema.payouts,
      supplier: sql<string>`(select x.legal_name from core.organisations x where x.id = ${schema.payouts.supplierOrganisationId})`,
    })
    .from(schema.payouts)
    .orderBy(desc(schema.payouts.runAt))
    .limit(page.limit ?? 200)
    .offset(page.offset ?? 0);
}

/** How many payouts there are (the pages of adminPayouts). */
export async function countAdminPayouts(db: Database, actor: Actor) {
  need(actor, "money.view");
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.payouts);
  return row?.n ?? 0;
}

/** The ledger summary per month (705:8): the identity and its parts. */
export async function ledgerMonths(db: Database, actor: Actor, months = 6) {
  need(actor, "money.view");
  const out = [];
  const now = new Date(Date.now() + 5.5 * 3_600_000);
  for (let i = 0; i < months; i++) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - i;
    const from = new Date(Date.UTC(y, m, 1) - 5.5 * 3_600_000);
    const to = new Date(Date.UTC(y, m + 1, 1) - 5.5 * 3_600_000);
    const label = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
    out.push({ month: label, ...(await monthlyIdentity(db, from, to)) });
  }
  return out;
}

export async function reconciliationIssues(
  db: Database,
  actor: Actor,
  open = true,
  page: { limit?: number; offset?: number } = {},
) {
  need(actor, "money.view");
  const r = schema.reconciliationIssues;
  return db
    .select()
    .from(r)
    .where(open ? isNull(r.resolvedAt) : undefined)
    .orderBy(desc(r.createdAt))
    .limit(page.limit ?? 200)
    .offset(page.offset ?? 0);
}

/** How many differences there are (the pages of reconciliationIssues). */
export async function countReconciliationIssues(db: Database, actor: Actor, open = true) {
  need(actor, "money.view");
  const r = schema.reconciliationIssues;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(r)
    .where(open ? isNull(r.resolvedAt) : undefined);
  return row?.n ?? 0;
}

/** Finance closes a reconciliation difference with what was done about it (money.edit, audited). */
export async function resolveIssue(
  db: Database,
  actor: Actor,
  issueId: string,
  resolution: string,
  context?: RequestContext,
) {
  need(actor, "money.edit");
  if (!resolution.trim()) throw new AdminOrderError("Say what was done", { resolution: "Say what was done" });
  const r = schema.reconciliationIssues;
  const [row] = await db
    .update(r)
    .set({ resolvedAt: new Date(), resolvedBy: actor.userId, resolution: resolution.trim() })
    .where(and(eq(r.id, issueId), isNull(r.resolvedAt)))
    .returning();
  if (!row) throw new AdminOrderError("This difference is already resolved");
  await audit(db, {
    actorId: actor.userId,
    action: "money.reconciliation_resolved",
    resourceType: "reconciliation_issue",
    resourceId: issueId,
    after: { resolution: resolution.trim() },
    context,
  });
}

/** Rate cards and the pilot list, as Settings shows them. */
export async function moneySettings(db: Database, actor: Actor) {
  need(actor, "money.view");
  return { rateCards: await getSetting(db, RATE_CARDS), pilot: await getSetting(db, PILOT_ORGANISATIONS) };
}

/** Adds a rate card version (step 10.11): only orders accepted from its effective date use it. settings.edit. */
export async function addRateCard(db: Database, actor: Actor, card: RateCard, context?: RequestContext) {
  const cards = await getSetting(db, RATE_CARDS);
  if (cards.some((c) => c.version === card.version)) throw new AdminOrderError("That version already exists");
  await setSetting(db, actor, RATE_CARDS, [...cards, card], { reason: `Rate card ${card.version}`, context });
}
