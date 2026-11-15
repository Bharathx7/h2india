import { schema, type Database } from "@h2india/db";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { inScope, type Scope } from "../authz/scope";

// Money pages (steps 10.8 and 10.11): the buyer's Payments and Refunds (720:281, 720:881) and the supplier's Fees and
// invoices (816:12052 to 822:13666). Every read is scoped to the company that owns the side being read.

const o = schema.orders;

/** Payments the buyer's company made, newest first (720:281). */
export async function buyerPayments(scope: Scope, db: Database, organisationId: string) {
  return db
    .select({
      id: schema.payments.id,
      orderId: o.id,
      reference: o.reference,
      supplier: sql<string>`(select coalesce(p.trade_name, x.legal_name) from core.organisations x
        left join core.company_profiles p on p.organisation_id = x.id where x.id = ${o.supplierOrganisationId})`,
      method: schema.payments.method,
      amountPaise: schema.payments.amountPaise,
      status: schema.payments.status,
      at: schema.payments.createdAt,
      confirmedAt: schema.payments.confirmedAt,
    })
    .from(schema.payments)
    .innerJoin(o, eq(o.id, schema.payments.orderId))
    .where(and(inScope(scope, o.buyerOrganisationId), eq(o.buyerOrganisationId, organisationId)))
    .orderBy(desc(schema.payments.createdAt));
}

/** Refunds to the buyer's company (720:881, 700:8). */
export async function buyerRefunds(scope: Scope, db: Database, organisationId: string) {
  return db
    .select({ refund: schema.refunds, orderId: o.id, orderRef: o.reference })
    .from(schema.refunds)
    .innerJoin(o, eq(o.id, schema.refunds.orderId))
    .where(and(inScope(scope, o.buyerOrganisationId), eq(o.buyerOrganisationId, organisationId)))
    .orderBy(desc(schema.refunds.createdAt));
}

/** Releases on the supplier's orders with their fee and deductions (816:12500 Orders and fees). */
export async function supplierSettlements(scope: Scope, db: Database, organisationId: string) {
  const s = schema.orderSettlements;
  return db
    .select({
      settlement: s,
      reference: o.reference,
      orderId: o.id,
      buyer: sql<string>`(select coalesce(p.trade_name, x.legal_name) from core.organisations x
        left join core.company_profiles p on p.organisation_id = x.id where x.id = ${o.buyerOrganisationId})`,
      payoutRef: sql<string | null>`(select po.reference from core.payouts po where po.id = ${s.payoutId})`,
      payoutStatus: sql<string | null>`(select po.status from core.payouts po where po.id = ${s.payoutId})`,
    })
    .from(s)
    .innerJoin(o, eq(o.id, s.orderId))
    .where(and(inScope(scope, s.supplierOrganisationId), eq(s.supplierOrganisationId, organisationId)))
    .orderBy(desc(s.createdAt));
}

/** Payout runs to the supplier (816:13000). */
export async function supplierPayouts(scope: Scope, db: Database, organisationId: string) {
  const p = schema.payouts;
  return db
    .select()
    .from(p)
    .where(and(inScope(scope, p.supplierOrganisationId), eq(p.supplierOrganisationId, organisationId)))
    .orderBy(desc(p.runAt));
}

/** One payout (817:12613) and the releases it paid. */
export async function supplierPayout(scope: Scope, db: Database, organisationId: string, payoutId: string) {
  const [payout] = await db
    .select()
    .from(schema.payouts)
    .where(
      and(
        eq(schema.payouts.id, payoutId),
        inScope(scope, schema.payouts.supplierOrganisationId),
        eq(schema.payouts.supplierOrganisationId, organisationId),
      ),
    );
  if (!payout) return null;
  const lines = await db
    .select({ settlement: schema.orderSettlements, reference: o.reference, orderId: o.id })
    .from(schema.orderSettlements)
    .innerJoin(o, eq(o.id, schema.orderSettlements.orderId))
    .where(eq(schema.orderSettlements.payoutId, payout.id));
  const [account] = payout.bankAccountId
    ? await db
        .select({ last4: schema.payoutBankAccounts.accountLast4, ifsc: schema.payoutBankAccounts.ifsc })
        .from(schema.payoutBankAccounts)
        .where(inArray(schema.payoutBankAccounts.id, [payout.bankAccountId]))
    : [];
  return { payout, lines, account: account ?? null };
}

export interface MonthTotals {
  /** "2026-11" */
  month: string;
  released: bigint;
  fee: bigint;
  gstOnFee: bigint;
  tcs: bigint;
  tds: bigint;
  net: bigint;
  orders: number;
}

/** Totals per month in IST (Tax credits 822:13176, Statements 822:13666, Overview 816:12052). */
export async function supplierMonths(
  scope: Scope,
  db: Database,
  organisationId: string,
  opts: { from?: Date; to?: Date } = {},
): Promise<MonthTotals[]> {
  const s = schema.orderSettlements;
  const month = sql<string>`to_char(${s.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM')`;
  const rows = await db
    .select({
      month,
      released: sql<string>`sum(${s.releasedPaise})::text`,
      fee: sql<string>`sum(${s.feePaise})::text`,
      gstOnFee: sql<string>`sum(${s.gstOnFeePaise})::text`,
      tcs: sql<string>`sum(${s.tcsPaise})::text`,
      tds: sql<string>`sum(${s.tdsPaise})::text`,
      net: sql<string>`sum(${s.netPaise})::text`,
      orders: sql<number>`count(distinct ${s.orderId})::int`,
    })
    .from(s)
    .where(
      and(
        inScope(scope, s.supplierOrganisationId),
        eq(s.supplierOrganisationId, organisationId),
        opts.from ? gte(s.createdAt, opts.from) : undefined,
        opts.to ? lt(s.createdAt, opts.to) : undefined,
      ),
    )
    .groupBy(month)
    .orderBy(desc(month));
  return rows.map((r) => ({
    month: r.month,
    released: BigInt(r.released),
    fee: BigInt(r.fee),
    gstOnFee: BigInt(r.gstOnFee),
    tcs: BigInt(r.tcs),
    tds: BigInt(r.tds),
    net: BigInt(r.net),
    orders: r.orders,
  }));
}
