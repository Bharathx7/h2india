import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { FlagOffError, requireFlag } from "@h2india/config";
import { z } from "zod";
import type { RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { inScope, type Scope } from "../authz/scope";
import { workingCalendar } from "../clocks/clocks";
import { nextReference } from "../reference";
import { defineSetting, getSetting } from "../settings";
import { changeStatus } from "../status";
import { Money } from "../money";
import { milestoneAmounts } from "../rfq/records";
import { SAMPLE_RATE_CARD, rateCardOn, rateCardSchema, type RateCard } from "./fees";
import { isOverdue, orderBadge, orderTransitions, type OrderMove, type OrderStatus } from "./transitions";
import { must } from "../must";

// Order records (step 10.1). Orders belong to two companies: the buyer and the supplier; each reads only its own
// (inScope on either side). Statuses move only through moveOrder() with a move the transition table allows; history and
// audit come with it. Money is worked out on the server from the product or quote records, never from the browser.

export const o = schema.orders;
export const ol = schema.orderLines;
export const om = schema.orderMilestones;

export class OrderError extends Error {
  constructor(
    message: string,
    readonly errors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export type OrderRow = typeof o.$inferSelect;

export interface MoveCtx {
  context?: RequestContext;
  reason?: string;
  metadata?: Record<string, unknown>;
  also?: (tx: Executor) => Promise<void>;
}

/** Move an order. The pair must be in orderTransitions (a type error otherwise, and checked again at run time). */
export async function moveOrder(
  ex: Executor,
  actorId: string | null,
  order: { id: string; buyerOrganisationId: string },
  move: OrderMove,
  ctx: MoveCtx = {},
) {
  await changeStatus(ex, {
    table: o,
    entityType: "order",
    id: order.id,
    from: move.from,
    to: move.to,
    actorId,
    companyId: order.buyerOrganisationId,
    transitions: orderTransitions,
    ...ctx,
  });
}

/** Notices go after the change is saved; a failed send never undoes it. */
export async function tell(work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    console.error("order notice failed", error);
  }
}

// ------------------------------------------------------------------------------------------------ rate cards

/** Rate card versions (step 10.11). Sample figures until the CA signs (OPEN: M11) and C1 to C3 are decided. */
export const RATE_CARDS = defineSetting<RateCard[]>({
  key: "money.rateCards",
  description: "Fee rate card versions: fee, cap, GST on fee, TCS, TDS, bases, overrides and launch-offer dates",
  schema: z.array(rateCardSchema).min(1),
  fallback: [SAMPLE_RATE_CARD],
});

export async function rateCardFor(ex: Executor, at: Date): Promise<RateCard> {
  const cards = await getSetting(ex, RATE_CARDS);
  return rateCardOn(cards, at) ?? cards[0] ?? SAMPLE_RATE_CARD;
}

export async function rateCardVersion(ex: Executor, version: string | null, at: Date): Promise<RateCard> {
  const cards = await getSetting(ex, RATE_CARDS);
  return cards.find((c) => c.version === version) ?? rateCardOn(cards, at) ?? SAMPLE_RATE_CARD;
}

// ------------------------------------------------------------------------------------------------ pilot (10.12)

/**
 * The Launch 2 pilot: with transactions on, only these companies may order or sell. Empty means every company (local
 * and staging, A176). Changed in System settings like any setting (settings.edit, audited).
 */
export const PILOT_ORGANISATIONS = defineSetting<string[]>({
  key: "transactions.pilotOrganisations",
  description: "Companies in the transactions pilot (empty: every company)",
  schema: z.array(z.uuid()),
  fallback: [],
});

/** requireFlag("transactions") plus the pilot list, for every company taking part. */
export async function requireTransactions(
  ex: Executor,
  organisationIds: string[],
  flags?: Record<string, string | undefined>,
) {
  requireFlag("transactions", flags);
  await requirePilot(ex, organisationIds);
}

/** Only the pilot list (the flag was checked by the caller). */
export async function requirePilot(ex: Executor, organisationIds: string[]) {
  const pilot = await getSetting(ex, PILOT_ORGANISATIONS);
  if (pilot.length && organisationIds.some((id) => !pilot.includes(id))) throw new FlagOffError("transactions");
}

/**
 * When suppliers are paid (A177, OPEN): 811:12584 and 813:12602 show the advance paid out 2 working days after the
 * buyer pays it ("Advance already paid out"), and the balance held until the buyer accepts the delivery. The playbook
 * (10.10) holds everything until acceptance; switch this off to do that.
 */
export const MONEY_RULES = defineSetting<{ releaseAdvanceOnPayment: boolean }>({
  key: "orders.moneyRules",
  description: "Pay out the advance once the buyer pays it (as drawn), or hold everything until acceptance",
  schema: z.object({ releaseAdvanceOnPayment: z.boolean() }),
  fallback: { releaseAdvanceOnPayment: true },
});

// ------------------------------------------------------------------------------------------------ milestones

/** Quote triggers (rfq/totals PAYMENT_TRIGGERS) and when each falls due. */
export const DUE_ON: Record<string, "confirmation" | "dispatch" | "receipt" | "acceptance"> = {
  Advance: "confirmation",
  "On confirmation": "confirmation",
  "Before dispatch": "dispatch",
  "On receipt": "receipt",
  Retention: "acceptance",
};

export function milestonePlan(totalPaise: bigint, schedule: { percentBps: number; trigger: string }[]) {
  const lines = schedule.length ? schedule : [{ percentBps: 10_000, trigger: "On confirmation" }];
  const amounts = milestoneAmounts(totalPaise, lines);
  return lines.map((l, i) => ({
    position: i,
    label: `${String(l.percentBps / 100)}% ${l.trigger.toLowerCase()}`,
    trigger: l.trigger,
    percentBps: l.percentBps,
    amountPaise: amounts[i] ?? 0n,
  }));
}

/** Marks the milestones whose moment has come as Due. Returns how many became due. */
export async function makeDue(
  tx: Executor,
  orderId: string,
  moment: "confirmation" | "dispatch" | "receipt" | "acceptance",
) {
  const triggers = Object.entries(DUE_ON)
    .filter(([, m]) => m === moment)
    .map(([t]) => t);
  const rows = await tx
    .update(om)
    .set({ status: "Due", dueAt: new Date() })
    .where(and(eq(om.orderId, orderId), eq(om.status, "Upcoming"), inArray(om.trigger, triggers)))
    .returning({ id: om.id });
  return rows.length;
}

/** What is due and unpaid now. */
export async function dueUnpaid(ex: Executor, orderId: string) {
  const rows = await ex
    .select()
    .from(om)
    .where(and(eq(om.orderId, orderId), inArray(om.status, ["Due", "Partly paid"])))
    .orderBy(asc(om.position));
  return rows;
}

/** Every milestone due at or before a moment is paid (confirmation: the advance; dispatch: before shipping). */
export async function paidThrough(
  ex: Executor,
  orderId: string,
  moment: "confirmation" | "dispatch",
): Promise<boolean> {
  const upTo = moment === "confirmation" ? ["confirmation"] : ["confirmation", "dispatch"];
  const rows = await ex.select().from(om).where(eq(om.orderId, orderId));
  return rows.filter((m) => upTo.includes(DUE_ON[m.trigger] ?? "")).every((m) => m.status === "Paid");
}

export const paidForDispatch = (ex: Executor, orderId: string) => paidThrough(ex, orderId, "dispatch");

// ------------------------------------------------------------------------------------------------ creating

export interface NewOrder {
  buyerOrganisationId: string;
  supplierOrganisationId: string;
  placedBy: string;
  source: "cart" | "quote";
  quoteId?: string | null;
  quoteVersionId?: string | null;
  deliverySiteId?: string | null;
  billingGstinId?: string | null;
  /** The supplier GSTIN it's invoiced under (founder QC, 17 Nov 2026). */
  supplierGstinId?: string | null;
  receiverName?: string | null;
  receiverMobile?: string | null;
  paymentMethod: string;
  poNumber?: string | null;
  poFileId?: string | null;
  dispatchBy?: Date | null;
  lines: {
    productId?: string | null;
    description: string;
    hsn?: string | null;
    quantity: number;
    unit?: string;
    unitPricePaise: bigint;
    gstRateBps: number;
  }[];
  freight?: { paise: bigint; gstRateBps: number };
  schedule: { percentBps: number; trigger: string }[];
  /** True when the buyer's rules send this order to an approver first (G1). */
  needsApproval: boolean;
}

/** The order's figures, worked out from the lines (never from the browser). */
export function orderFigures(lines: NewOrder["lines"], freight?: NewOrder["freight"]) {
  let subtotal = 0n;
  let gst = 0n;
  for (const l of lines) {
    const amount = l.unitPricePaise * BigInt(l.quantity);
    subtotal += amount;
    gst += Money.percent(amount, l.gstRateBps);
  }
  const f = freight?.paise ?? 0n;
  if (f > 0n) gst += Money.percent(f, freight?.gstRateBps ?? 0);
  return { subtotalPaise: subtotal, freightPaise: f, gstPaise: gst, totalPaise: subtotal + f + gst };
}

/** Creates the order, its lines and milestones in one transaction. Returns the new order. */
export async function insertOrder(tx: Executor, input: NewOrder): Promise<OrderRow> {
  const figures = orderFigures(input.lines, input.freight);
  const reference = await nextReference(tx, "ORD");
  const status: OrderStatus = input.needsApproval ? "Awaiting approval" : "Pending acceptance";
  const [row] = await tx
    .insert(o)
    .values({
      reference,
      buyerOrganisationId: input.buyerOrganisationId,
      supplierOrganisationId: input.supplierOrganisationId,
      placedBy: input.placedBy,
      status,
      source: input.source,
      quoteId: input.quoteId ?? null,
      quoteVersionId: input.quoteVersionId ?? null,
      tier: "A",
      deliverySiteId: input.deliverySiteId ?? null,
      billingGstinId: input.billingGstinId ?? null,
      supplierGstinId: input.supplierGstinId ?? null,
      receiverName: input.receiverName ?? null,
      receiverMobile: input.receiverMobile ?? null,
      paymentMethod: input.paymentMethod,
      poNumber: input.poNumber ?? null,
      poFileId: input.poFileId ?? null,
      dispatchBy: input.dispatchBy ?? null,
      ...figures,
    })
    .returning();
  const order = must(row);
  await tx.insert(ol).values(
    input.lines.map((l, i) => ({
      orderId: order.id,
      productId: l.productId ?? null,
      description: l.description,
      hsn: l.hsn ?? null,
      quantity: l.quantity,
      unit: l.unit ?? "units",
      unitPricePaise: l.unitPricePaise,
      gstRateBps: l.gstRateBps,
      position: i,
    })),
  );
  await tx.insert(om).values(milestonePlan(order.totalPaise, input.schedule).map((m) => ({ ...m, orderId: order.id })));
  await tx.insert(schema.statusHistory).values({
    entityType: "order",
    entityId: order.id,
    fromStatus: null,
    toStatus: status,
    actorId: input.placedBy,
    reason: null,
    metadata: { source: input.source },
  });
  return order;
}

// ------------------------------------------------------------------------------------------------ reading

/** The clock facts that make an order Overdue (10.1): supplier's 48 hours, a due payment, the dispatch date. */
async function overdueFacts(ex: Executor, ids: string[]) {
  if (!ids.length) return new Map<string, { acceptBy: Date | null; paymentDueAt: Date | null }>();
  const d = schema.deadlines;
  const deadlines = await ex
    .select({ subjectId: d.subjectId, dueAt: d.dueAt })
    .from(d)
    .where(and(eq(d.type, "supplierAcceptsOrder"), eq(d.status, "Open"), inArray(d.subjectId, ids)));
  const due = await ex
    .select({ orderId: om.orderId, dueAt: sql<Date | null>`min(${om.dueAt})` })
    .from(om)
    .where(and(inArray(om.orderId, ids), inArray(om.status, ["Due", "Partly paid"])))
    .groupBy(om.orderId);
  const out = new Map<string, { acceptBy: Date | null; paymentDueAt: Date | null }>();
  for (const id of ids) out.set(id, { acceptBy: null, paymentDueAt: null });
  for (const x of deadlines) must(out.get(x.subjectId)).acceptBy = x.dueAt;
  for (const x of due) must(out.get(x.orderId)).paymentDueAt = x.dueAt ? new Date(x.dueAt) : null;
  return out;
}

export interface OrderListItem {
  id: string;
  reference: string;
  status: OrderStatus;
  badge: ReturnType<typeof orderBadge>;
  overdue: boolean;
  buyerName: string;
  supplierName: string;
  itemSummary: string;
  totalPaise: bigint;
  dueNowPaise: bigint;
  createdAt: Date;
  dispatchBy: Date | null;
  /** When the supplier's 48 hours end (Pending acceptance). */
  acceptBy: Date | null;
  /** The earliest unpaid milestone that is due, for "Advance ₹… due 13 Nov". */
  due: { label: string; amountPaise: bigint; dueAt: Date | null } | null;
  transporter: string | null;
  shippedAt: Date | null;
  /** When the buyer's 5 working days to accept end (Delivered). */
  buyerAcceptBy: Date | null;
  closedAt: Date | null;
}

// The outer column is written out (core.orders.…): in a single-table select Drizzle prints ${column} unqualified,
// and inside this subquery it would bind to core.organisations (CLAUDE.md, step 9.2 note).
const companyName = (side: "buyer" | "supplier") =>
  side === "buyer"
    ? sql<string>`(select coalesce(p.trade_name, x.legal_name) from core.organisations x
    left join core.company_profiles p on p.organisation_id = x.id where x.id = core.orders.buyer_organisation_id)`
    : sql<string>`(select coalesce(p.trade_name, x.legal_name) from core.organisations x
    left join core.company_profiles p on p.organisation_id = x.id where x.id = core.orders.supplier_organisation_id)`;

/** Orders for a buyer company or a supplier company (side), newest first, optionally by status. */
export async function listOrders(
  scope: Scope,
  db: Database,
  input: { organisationId: string; side: "buyer" | "supplier"; statuses?: readonly OrderStatus[]; limit?: number },
  now: Date = new Date(),
): Promise<OrderListItem[]> {
  const column = input.side === "buyer" ? o.buyerOrganisationId : o.supplierOrganisationId;
  const rows = await db
    .select({
      order: o,
      buyerName: companyName("buyer"),
      supplierName: companyName("supplier"),
      firstLine: sql<string>`(select description from core.order_lines l where l.order_id = core.orders.id order by position limit 1)`,
      lineCount: sql<number>`(select count(*)::int from core.order_lines l where l.order_id = core.orders.id)`,
      dueNow: sql<string>`(select coalesce(sum(amount_paise - paid_paise), 0)::text from core.order_milestones m
        where m.order_id = core.orders.id and m.status in ('Due', 'Partly paid'))`,
      dueLabel: sql<string | null>`(select m.trigger from core.order_milestones m
        where m.order_id = core.orders.id and m.status in ('Due', 'Partly paid') order by m.position limit 1)`,
      dueAt: sql<string | null>`(select m.due_at from core.order_milestones m
        where m.order_id = core.orders.id and m.status in ('Due', 'Partly paid') order by m.position limit 1)`,
      transporter: sql<string | null>`(select s.transporter from core.shipments s where s.order_id = core.orders.id)`,
      buyerAcceptBy: sql<string | null>`(select d.due_at from core.deadlines d where d.subject_id = core.orders.id::text
        and d.type = 'buyerAcceptsDelivery' and d.status = 'Open')`,
    })
    .from(o)
    .where(
      and(
        inScope(scope, column),
        eq(column, input.organisationId),
        input.statuses?.length ? inArray(o.status, [...input.statuses]) : undefined,
      ),
    )
    .orderBy(desc(o.createdAt))
    .limit(input.limit ?? 200);
  const facts = await overdueFacts(
    db,
    rows.map((r) => r.order.id),
  );
  return rows.map((r) => {
    const f = facts.get(r.order.id);
    const status = r.order.status as OrderStatus;
    const overdueInput = { status, dispatchBy: r.order.dispatchBy, ...f };
    return {
      id: r.order.id,
      reference: r.order.reference,
      status,
      badge: orderBadge(overdueInput, now),
      overdue: isOverdue(overdueInput, now),
      buyerName: r.buyerName,
      supplierName: r.supplierName,
      itemSummary: r.lineCount > 1 ? `${r.firstLine} + ${String(r.lineCount - 1)} more` : r.firstLine,
      totalPaise: r.order.totalPaise,
      dueNowPaise: BigInt(r.dueNow),
      createdAt: r.order.createdAt,
      dispatchBy: r.order.dispatchBy,
      acceptBy: f?.acceptBy ?? null,
      due: r.dueLabel
        ? { label: r.dueLabel, amountPaise: BigInt(r.dueNow), dueAt: r.dueAt ? new Date(r.dueAt) : null }
        : null,
      transporter: r.transporter,
      shippedAt: r.order.shippedAt,
      buyerAcceptBy: r.buyerAcceptBy ? new Date(r.buyerAcceptBy) : null,
      closedAt: r.order.closedAt,
    };
  });
}

/** One order, if the scope may read it (either side), with everything its page shows. */
export async function orderDetail(scope: Scope, db: Database, orderId: string, now: Date = new Date()) {
  const [row] = await db
    .select({
      order: o,
      buyerName: companyName("buyer"),
      supplierName: companyName("supplier"),
      placedByName: sql<string>`(select name from core.users u where u.id = core.orders.placed_by)`,
      site: sql<
        string | null
      >`(select concat_ws(', ', d.name, d.city, d.state) from core.delivery_sites d where d.id = core.orders.delivery_site_id)`,
      gstin: sql<
        string | null
      >`(select g.gstin from core.organisation_gstins g where g.id = core.orders.billing_gstin_id)`,
      supplierGstin: sql<
        string | null
      >`(select g.gstin from core.organisation_gstins g where g.id = core.orders.supplier_gstin_id)`,
    })
    .from(o)
    .where(and(eq(o.id, orderId), or(inScope(scope, o.buyerOrganisationId), inScope(scope, o.supplierOrganisationId))));
  if (!row) return null;
  const id = row.order.id;
  const [lines, milestones, history, shipment, receipt, disputes, refunds, payments, account, approvals, dateChanges] =
    await Promise.all([
      db.select().from(ol).where(eq(ol.orderId, id)).orderBy(asc(ol.position)),
      db.select().from(om).where(eq(om.orderId, id)).orderBy(asc(om.position)),
      db
        .select()
        .from(schema.statusHistory)
        .where(and(eq(schema.statusHistory.entityType, "order"), eq(schema.statusHistory.entityId, id)))
        .orderBy(asc(schema.statusHistory.at)),
      db.select().from(schema.shipments).where(eq(schema.shipments.orderId, id)),
      db.select().from(schema.deliveryReceipts).where(eq(schema.deliveryReceipts.orderId, id)),
      db.select().from(schema.disputes).where(eq(schema.disputes.orderId, id)).orderBy(desc(schema.disputes.createdAt)),
      db.select().from(schema.refunds).where(eq(schema.refunds.orderId, id)).orderBy(desc(schema.refunds.createdAt)),
      db.select().from(schema.payments).where(eq(schema.payments.orderId, id)).orderBy(desc(schema.payments.createdAt)),
      db.select().from(schema.orderAccounts).where(eq(schema.orderAccounts.orderId, id)),
      db
        .select()
        .from(schema.orderApprovals)
        .where(eq(schema.orderApprovals.orderId, id))
        .orderBy(asc(schema.orderApprovals.step)),
      db
        .select()
        .from(schema.dispatchDateChanges)
        .where(eq(schema.dispatchDateChanges.orderId, id))
        .orderBy(desc(schema.dispatchDateChanges.at)),
    ]);
  const facts = (await overdueFacts(db, [id])).get(id);
  const status = row.order.status as OrderStatus;
  const overdueInput = { status, dispatchBy: row.order.dispatchBy, ...facts };
  const side = scope.organisationIds.includes(row.order.buyerOrganisationId)
    ? ("buyer" as const)
    : scope.organisationIds.includes(row.order.supplierOrganisationId)
      ? ("supplier" as const)
      : ("operator" as const);
  return {
    ...row,
    side,
    status,
    badge: orderBadge(overdueInput, now),
    overdue: isOverdue(overdueInput, now),
    acceptBy: facts?.acceptBy ?? null,
    lines,
    milestones,
    history,
    shipment: shipment[0] ?? null,
    receipt: receipt[0] ?? null,
    disputes,
    refunds,
    payments,
    account: account[0] ?? null,
    approvals,
    dateChanges,
  };
}
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof orderDetail>>>;

/** Loads an order the actor's company holds on the given side, or throws. */
export async function ownOrder(ex: Executor, organisationId: string, orderId: string, side: "buyer" | "supplier") {
  const column = side === "buyer" ? o.buyerOrganisationId : o.supplierOrganisationId;
  const [row] = await ex
    .select()
    .from(o)
    .where(and(eq(o.id, orderId), eq(column, organisationId)));
  if (!row) throw new OrderError("No such order");
  return row;
}

/** The people at a company whose role has a permission (for notices). */
export async function peopleWith(
  ex: Executor,
  organisationId: string,
  permission: string,
  roleScope: "buyer" | "supplier",
) {
  const m = schema.memberships;
  return ex
    .select({ id: schema.users.id, name: schema.users.name })
    .from(m)
    .innerJoin(schema.users, eq(schema.users.id, m.userId))
    .where(
      and(
        eq(m.organisationId, organisationId),
        sql`exists (select 1 from core.roles ro join core.role_permissions rp on rp.role_id = ro.id
          where ro.name = ${m.role} and ro.scope = ${roleScope} and rp.permission_key = ${permission})`,
      ),
    );
}

export async function calendar(ex: Executor) {
  return workingCalendar(ex);
}

export type { Actor };
