import { createHash, randomBytes, randomInt } from "node:crypto";
import { parseServerEnv, requireFlag } from "@h2india/config";
import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { VISITOR, type Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { cancelDeadline, completeDeadline, onDeadline, startClock } from "../clocks/clocks";
import { passkeyConfirmedRecently } from "../sign-in/step-up";
import { nextReference } from "../reference";
import { attachFile } from "../files/files";
import { deliverSms } from "../notify/channels";
import { defineSetting, getSetting } from "../settings";
import { formatIstDate, formatIstDateTime, formatIstDayMonth } from "../time";
import {
  dispatchChecklist,
  dispatchRulesSchema,
  DRAWN_DISPATCH_RULES,
  itemsLeft,
  type DispatchRules,
} from "./dispatch";
import { heldOn, openPayments, orderAccount, refund, release } from "./money";
import {
  noticeApprovalNeeded,
  noticeDispatched,
  noticeDisputeOpened,
  noticeOrderConfirmed,
  noticeOrderPlaced,
  noticeStatus,
} from "./notices";
import {
  DUE_ON,
  dueUnpaid,
  insertOrder,
  makeDue,
  moveOrder,
  o,
  om,
  orderFigures,
  OrderError,
  ownOrder,
  paidForDispatch,
  rateCardFor,
  requirePilot,
  requireTransactions,
  tell,
  type NewOrder,
  type OrderRow,
} from "./records";
import type { OrderStatus } from "./transitions";
import { must } from "../must";

// The order's life (steps 10.2, 10.3, 10.7, 10.9, 10.10). Every function here is behind the transactions flag (C8,
// A176), checks the person's permission for the company that owns the side they act on, and moves the order only
// through moveOrder(). Money moves through ./money (partner and ledger).

const ACCEPT_CLOCK = "supplierAcceptsOrder";
const BUYER_CLOCK = "buyerAcceptsDelivery";

// ------------------------------------------------------------------------------------------------ approval routing

export interface ApprovalStep {
  step: 1 | 2;
  /** Who may approve this step (the named approver, their delegate, or, when the approver placed the order, any other
   * approver whose limit covers it). */
  approverIds: string[];
}

/** Works out the approvals an order needs (576:300). Empty when none. */
export async function approvalRoute(
  ex: Executor,
  organisationId: string,
  requesterId: string,
  totalPaise: bigint,
  now: Date = new Date(),
): Promise<ApprovalStep[]> {
  const [settings] = await ex
    .select()
    .from(schema.buyerSettings)
    .where(eq(schema.buyerSettings.organisationId, organisationId));
  const [seat] = await ex
    .select({ limit: schema.memberships.orderLimitPaise })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.organisationId, organisationId), eq(schema.memberships.userId, requesterId)));
  const overOwnLimit = seat?.limit !== null && seat?.limit !== undefined && totalPaise > seat.limit;
  const overRule =
    settings?.approvalAbovePaise !== null &&
    settings?.approvalAbovePaise !== undefined &&
    totalPaise > settings.approvalAbovePaise;
  if (!overOwnLimit && !overRule) return [];
  const delegations = await ex
    .select()
    .from(schema.approvalDelegations)
    .where(
      and(
        eq(schema.approvalDelegations.organisationId, organisationId),
        isNull(schema.approvalDelegations.endedAt),
        lte(schema.approvalDelegations.startsOn, now),
        gt(schema.approvalDelegations.endsOn, now),
      ),
    );
  const others = await otherApprovers(ex, organisationId, requesterId, totalPaise);
  const forPerson = (id: string | null | undefined) => {
    if (!id || id === requesterId) return others;
    const delegates = delegations.filter((d) => d.fromUserId === id).map((d) => d.toUserId);
    return [id, ...delegates].filter((x) => x !== requesterId);
  };
  const steps: ApprovalStep[] = [{ step: 1, approverIds: forPerson(settings?.approverId) }];
  if (
    settings?.secondApproval &&
    settings.secondAbovePaise !== null &&
    totalPaise > settings.secondAbovePaise &&
    settings.secondApproverId
  ) {
    steps.push({ step: 2, approverIds: forPerson(settings.secondApproverId) });
  }
  return steps;
}

/** Other people at the company with order.approve whose own limit covers the total. */
async function otherApprovers(ex: Executor, organisationId: string, requesterId: string, totalPaise: bigint) {
  const m = schema.memberships;
  const rows = await ex
    .select({ id: m.userId, limit: m.orderLimitPaise })
    .from(m)
    .where(
      and(
        eq(m.organisationId, organisationId),
        sql`${m.userId} <> ${requesterId}`,
        sql`exists (select 1 from core.roles ro join core.role_permissions rp on rp.role_id = ro.id
          where ro.name = ${m.role} and ro.scope = 'buyer' and rp.permission_key = 'order.approve')`,
      ),
    );
  return rows.filter((r) => r.limit === null || totalPaise <= r.limit).map((r) => r.id);
}

async function placed(db: Database, order: OrderRow) {
  if (order.status === "Awaiting approval") {
    const route = await approvalRoute(db, order.buyerOrganisationId, order.placedBy, order.totalPaise);
    await tell(() => noticeApprovalNeeded(db, order, route[0]?.approverIds ?? []));
  } else {
    await tell(() => noticeOrderPlaced(db, order));
  }
}

async function startAcceptClock(tx: Executor, order: { id: string }) {
  await startClock(tx, { clock: ACCEPT_CLOCK, subjectType: "order", subjectId: order.id });
}

// ------------------------------------------------------------------------------------------------ placing (10.2)

export interface CheckoutInput {
  deliverySiteId: string;
  billingGstinId: string;
  receiverName: string;
  receiverMobile: string;
  paymentMethod: "bank_transfer" | "online" | "pay_later" | "letter_of_credit";
  /** Purchase order number and PDF (768:47189), optional. */
  poNumber?: string | null;
  poFileId?: string | null;
}

function checkMethod(method: CheckoutInput["paymentMethod"], flags?: Record<string, string | undefined>) {
  if (method === "pay_later") requireFlag("payLater", flags);
  if (method === "letter_of_credit") requireFlag("letterOfCredit", flags);
}

/** Delivery site and billing GSTIN must be the buyer's own; the GSTIN must be verified (575:331). */
async function checkPlaces(ex: Executor, organisationId: string, input: CheckoutInput) {
  const errors: Record<string, string> = {};
  const [site] = await ex
    .select()
    .from(schema.deliverySites)
    .where(
      and(eq(schema.deliverySites.id, input.deliverySiteId), eq(schema.deliverySites.organisationId, organisationId)),
    );
  if (!site) errors.deliverySiteId = "Choose a delivery site";
  const [g] = await ex
    .select()
    .from(schema.organisationGstins)
    .where(
      and(
        eq(schema.organisationGstins.id, input.billingGstinId),
        eq(schema.organisationGstins.organisationId, organisationId),
      ),
    );
  if (!g) errors.billingGstinId = "Choose a billing GSTIN";
  else if (g.portalStatus !== "Active") errors.billingGstinId = "Bill to a verified GSTIN";
  if (!input.receiverName.trim()) errors.receiverName = "Enter who receives the delivery";
  if (!/^[6-9]\d{9}$/.test(input.receiverMobile.replace(/\D/g, "").slice(-10)))
    errors.receiverMobile = "Enter a 10-digit mobile number";
  if (Object.keys(errors).length) throw new OrderError("Check the highlighted fields", errors);
}

/**
 * Places an order from the cart (10.2): re-reads every price, GST rate and stock from the product records (never the
 * browser), checks the person's limit and routes to approval when needed. Nothing is charged.
 */
export async function placeCartOrder(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: CheckoutInput,
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.place", { organisationId });
  checkMethod(input.paymentMethod, opts.flags);
  const userId = must(actor.userId);
  const order = await db.transaction(async (tx) => {
    await checkPlaces(tx, organisationId, input);
    const [cart] = await tx
      .select()
      .from(schema.carts)
      .where(and(eq(schema.carts.organisationId, organisationId), eq(schema.carts.userId, userId)))
      .for("update");
    if (!cart?.supplierId) throw new OrderError("Your cart is empty");
    await requirePilot(tx, [cart.supplierId]);
    const items = await tx
      .select({ item: schema.cartItems, product: schema.products })
      .from(schema.cartItems)
      .innerJoin(schema.products, eq(schema.products.id, schema.cartItems.productId))
      .where(eq(schema.cartItems.cartId, cart.id))
      .orderBy(asc(schema.cartItems.addedAt));
    if (!items.length) throw new OrderError("Your cart is empty");
    const errors: Record<string, string> = {};
    for (const { item, product } of items) {
      if (product.status !== "Live" || product.deletedAt) errors[item.id] = `${product.name} is no longer available`;
      else if (product.pricing !== "fixed" || !product.pricePaise) errors[item.id] = `${product.name} needs a quote`;
      else if (product.gstRateBps === null) errors[item.id] = `${product.name} has no GST rate yet; request a quote`;
      else if (product.minOrder && item.quantity < product.minOrder)
        errors[item.id] = `Minimum order for ${product.name} is ${String(product.minOrder)}`;
      else if (product.stock === "in_stock" && product.stockQty !== null && item.quantity > product.stockQty)
        errors[item.id] = `Only ${String(product.stockQty)} of ${product.name} in stock`;
      if (product.organisationId !== cart.supplierId) errors[item.id] = "Items must come from one supplier";
    }
    if (Object.keys(errors).length) throw new OrderError("Some items in your cart changed", errors);
    const lines: NewOrder["lines"] = items.map(({ item, product }) => ({
      productId: product.id,
      description: product.name,
      quantity: item.quantity,
      unitPricePaise: must(product.pricePaise),
      gstRateBps: must(product.gstRateBps),
    }));
    const total = orderFigures(lines).totalPaise;
    const route = await approvalRoute(tx, organisationId, userId, total);
    const order = await insertOrder(tx, {
      buyerOrganisationId: organisationId,
      supplierOrganisationId: cart.supplierId,
      placedBy: userId,
      source: "cart",
      deliverySiteId: input.deliverySiteId,
      billingGstinId: input.billingGstinId,
      receiverName: input.receiverName.trim(),
      receiverMobile: input.receiverMobile.replace(/\D/g, "").slice(-10),
      paymentMethod: input.paymentMethod,
      poNumber: input.poNumber?.trim() || null,
      poFileId: input.poFileId ?? null,
      lines,
      // A fixed-price cart is paid in full once the supplier confirms (Checkout 3 Payment 80:6464).
      schedule: [{ percentBps: 10_000, trigger: "On confirmation" }],
      needsApproval: route.length > 0,
    });
    for (const { product, item } of items) {
      if (product.stock === "in_stock" && product.stockQty !== null) {
        await tx
          .update(schema.products)
          .set({ stockQty: sql`${schema.products.stockQty} - ${item.quantity}` })
          .where(eq(schema.products.id, product.id));
      }
    }
    if (input.poFileId)
      await attachFile(tx, {
        actor,
        fileId: input.poFileId,
        kind: "order_document",
        attachedType: "order",
        attachedId: order.id,
      });
    await tx.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
    await tx.update(schema.carts).set({ supplierId: null }).where(eq(schema.carts.id, cart.id));
    if (order.status === "Pending acceptance") await startAcceptClock(tx, order);
    await audit(tx, {
      actorId: userId,
      action: "order.placed",
      resourceType: "order",
      resourceId: order.id,
      companyId: organisationId,
      after: { reference: order.reference, totalPaise: order.totalPaise.toString(), status: order.status },
      context,
    });
    return order;
  });
  await placed(db, order);
  return order;
}

/** The order made when a buyer accepts a quote (9.8 → 10.1): the quote version's lines, freight and schedule. */
export async function orderFromQuote(
  tx: Executor,
  actor: Actor,
  input: {
    buyerOrganisationId: string;
    quote: { id: string; organisationId: string };
    version: typeof schema.quoteVersions.$inferSelect;
    rfq: { deliverySiteId: string | null; billingGstinId: string | null };
    receiverName?: string | null;
    receiverMobile?: string | null;
  },
) {
  const lines = await tx
    .select()
    .from(schema.quoteLines)
    .where(eq(schema.quoteLines.versionId, input.version.id))
    .orderBy(asc(schema.quoteLines.position));
  const schedule = await tx
    .select()
    .from(schema.quotePaymentLines)
    .where(eq(schema.quotePaymentLines.versionId, input.version.id))
    .orderBy(asc(schema.quotePaymentLines.position));
  await requirePilot(tx, [input.buyerOrganisationId, input.quote.organisationId]);
  const userId = must(actor.userId);
  const route = await approvalRoute(tx, input.buyerOrganisationId, userId, input.version.totalPaise);
  let receiverName = input.receiverName ?? null;
  let receiverMobile = input.receiverMobile ?? null;
  if (!receiverName && input.rfq.deliverySiteId) {
    const [site] = await tx
      .select()
      .from(schema.deliverySites)
      .where(eq(schema.deliverySites.id, input.rfq.deliverySiteId));
    const c = site?.contacts[0];
    if (c) {
      receiverName = c.name;
      receiverMobile = c.mobile;
    }
  }
  const lead = input.version.leadTimeWeeks;
  const order = await insertOrder(tx, {
    buyerOrganisationId: input.buyerOrganisationId,
    supplierOrganisationId: input.quote.organisationId,
    placedBy: userId,
    source: "quote",
    quoteId: input.quote.id,
    quoteVersionId: input.version.id,
    deliverySiteId: input.rfq.deliverySiteId,
    billingGstinId: input.rfq.billingGstinId,
    receiverName,
    receiverMobile,
    paymentMethod: "bank_transfer",
    dispatchBy: lead ? new Date(Date.now() + lead * 7 * 86_400_000) : null,
    lines: lines.map((l) => ({
      description: l.description,
      hsn: l.hsn,
      quantity: l.quantity,
      unit: l.unit,
      unitPricePaise: l.unitPricePaise,
      gstRateBps: l.gstRateBps,
    })),
    freight: { paise: input.version.freightPaise, gstRateBps: input.version.freightGstRateBps },
    schedule: schedule.map((s) => ({ percentBps: s.percentBps, trigger: s.trigger })),
    needsApproval: route.length > 0,
  });
  if (order.totalPaise !== input.version.totalPaise)
    throw new OrderError("The order total doesn't match the quote; ask the supplier to revise it");
  if (order.status === "Pending acceptance") await startAcceptClock(tx, order);
  return order;
}

export async function afterQuoteOrder(db: Database, order: OrderRow) {
  await placed(db, order);
}

// ------------------------------------------------------------------------------------------------ approval (10.3)

/**
 * Approve an order (806:14572). Needs a passkey confirmed in the last few minutes, never by the requester, by someone
 * the route names for the next step. The last step moves the order to Pending acceptance and tells the supplier.
 * If the quote it came from has expired, approval is refused (G4 default: ask for a revised quote).
 */
export async function approveOrder(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { note?: string } = {},
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined>; now?: Date } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.approve", { organisationId });
  const userId = must(actor.userId);
  const now = opts.now ?? new Date();
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  if (order.status !== "Awaiting approval") throw new OrderError("This order isn't waiting for approval");
  if (order.placedBy === userId) throw new OrderError("You can't approve your own order");
  if (!(await passkeyConfirmedRecently(db, userId))) throw new OrderError("step_up");
  if (order.quoteVersionId) {
    const [v] = await db.select().from(schema.quoteVersions).where(eq(schema.quoteVersions.id, order.quoteVersionId));
    if (v?.validUntil && v.validUntil <= now) throw new OrderError("quote_expired");
  }
  const route = await approvalRoute(db, organisationId, order.placedBy, order.totalPaise, now);
  const done = await db.select().from(schema.orderApprovals).where(eq(schema.orderApprovals.orderId, order.id));
  const next = route.find((s) => !done.some((d) => d.step === s.step));
  if (!next) throw new OrderError("This order has all its approvals");
  if (!next.approverIds.includes(userId)) throw new OrderError("You aren't the approver for this step");
  const last = next.step === route[route.length - 1]?.step;
  const delegation = await db
    .select({ from: schema.approvalDelegations.fromUserId })
    .from(schema.approvalDelegations)
    .where(
      and(
        eq(schema.approvalDelegations.organisationId, organisationId),
        eq(schema.approvalDelegations.toUserId, userId),
        isNull(schema.approvalDelegations.endedAt),
      ),
    );
  await db.transaction(async (tx) => {
    await tx.insert(schema.orderApprovals).values({
      orderId: order.id,
      step: next.step,
      approverId: userId,
      onBehalfOf: delegation[0]?.from ?? null,
      decision: "Approved",
      note: input.note ?? null,
    });
    await audit(tx, {
      actorId: userId,
      action: "order.approved",
      resourceType: "order",
      resourceId: order.id,
      companyId: organisationId,
      after: { step: next.step },
      context,
    });
    if (last) {
      await moveOrder(
        tx,
        userId,
        order,
        { from: "Awaiting approval", to: "Pending acceptance" },
        {
          context,
          reason: `Approved (step ${String(next.step)})`,
          also: async (t) => {
            await startAcceptClock(t, order);
          },
        },
      );
    }
  });
  const fresh = must((await db.select().from(o).where(eq(o.id, order.id)))[0]);
  if (last) await tell(() => noticeOrderPlaced(db, fresh));
  else {
    const after = route.find((s) => s.step > next.step);
    await tell(() => noticeApprovalNeeded(db, fresh, after?.approverIds ?? []));
  }
  return fresh;
}

/** Turn down an order waiting for approval: it is cancelled with the reason; the requester is told. */
export async function rejectApproval(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  reason: string,
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.approve", { organisationId });
  if (!reason.trim()) throw new OrderError("Say why", { reason: "Say why you're not approving it" });
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  if (order.placedBy === actor.userId) throw new OrderError("You can't decide on your own order");
  await moveOrder(
    db,
    actor.userId,
    order,
    { from: "Awaiting approval", to: "Cancelled" },
    {
      context,
      reason,
      also: async (tx) => {
        await tx
          .update(o)
          .set({ cancelledAt: new Date(), cancelReason: `Not approved: ${reason}` })
          .where(eq(o.id, order.id));
      },
    },
  );
  await tell(() => noticeStatus(db, order, "buyer", `${order.reference} wasn't approved: ${reason}`, "x-circle"));
}

// ------------------------------------------------------------------------------------------------ supplier (10.7)

/** Accept (693:8): the rate card is fixed, the order account is made, and the advance (if any) falls due. */
export async function supplierAccept(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { dispatchBy?: Date | null } = {},
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.manage", { organisationId });
  const order = await ownOrder(db, organisationId, orderId, "supplier");
  if (order.status !== "Pending acceptance") throw new OrderError("This order isn't waiting for you");
  // 693:8: the dispatch date is required, and the buyer sees it.
  const dispatchBy = input.dispatchBy ?? order.dispatchBy;
  if (!dispatchBy) throw new OrderError("Choose a dispatch date", { dispatchBy: "Choose the date you'll dispatch" });
  const now = new Date();
  const card = await rateCardFor(db, now);
  await orderAccount(db, order);
  let next: OrderStatus = "Awaiting payment";
  await db.transaction(async (tx) => {
    await moveOrder(
      tx,
      actor.userId,
      order,
      { from: "Pending acceptance", to: "Accepted" },
      {
        context,
        also: async (t) => {
          await t
            .update(o)
            .set({ acceptedAt: now, rateCardVersion: card.version, dispatchBy })
            .where(eq(o.id, order.id));
          await completeDeadline(t, { type: ACCEPT_CLOCK, subjectType: "order", subjectId: order.id });
        },
      },
    );
    next = await openPayments(tx, order);
    await moveOrder(tx, actor.userId, order, { from: "Accepted", to: next }, { context });
  });
  const fresh = must((await db.select().from(o).where(eq(o.id, order.id)))[0]);
  const due = await dueUnpaid(db, order.id);
  const amount = due.reduce((t, m) => t + m.amountPaise - m.paidPaise, 0n);
  const supplierName = (await companyNames(db, fresh)).supplier;
  const dueAt = due[0]?.dueAt ?? null;
  await tell(() => noticeOrderConfirmed(db, fresh, supplierName, amount, dueAt ? formatIstDate(dueAt) : null));
  return fresh;
}

/** Decline (693:8): "Declining asks for a reason and tells the buyer straight away" (free text); the buyer can request quotes again. */
export async function supplierDecline(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { reason: string },
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.manage", { organisationId });
  if (!input.reason.trim()) throw new OrderError("Give a reason", { reason: "Tell the buyer why you can't fulfil it" });
  const order = await ownOrder(db, organisationId, orderId, "supplier");
  await moveOrder(
    db,
    actor.userId,
    order,
    { from: "Pending acceptance", to: "Declined" },
    {
      context,
      reason: input.reason,
      also: async (tx) => {
        await tx
          .update(o)
          .set({ declinedAt: new Date(), declineReason: input.reason.trim() })
          .where(eq(o.id, order.id));
        await cancelDeadline(tx, { type: ACCEPT_CLOCK, subjectType: "order", subjectId: order.id });
        await restock(tx, order.id);
      },
    },
  );
  await tell(() => noticeStatus(db, order, "buyer", `${order.reference} was declined: ${input.reason}`, "x-circle"));
}

async function restock(tx: Executor, orderId: string) {
  const lines = await tx.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, orderId));
  for (const l of lines) {
    if (!l.productId) continue;
    await tx
      .update(schema.products)
      .set({ stockQty: sql`${schema.products.stockQty} + ${l.quantity}` })
      .where(and(eq(schema.products.id, l.productId), eq(schema.products.stock, "in_stock")));
  }
}

const DATE_OPEN: readonly string[] = ["Accepted", "Awaiting payment", "Ready to dispatch"];

/** The supplier moves the dispatch date (G8): the buyer is told; no penalty. */
export async function changeDispatchDate(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { date: Date; reason: string },
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.manage", { organisationId });
  if (!input.reason.trim()) throw new OrderError("Say why", { reason: "Tell the buyer why the date moves" });
  const order = await ownOrder(db, organisationId, orderId, "supplier");
  if (!DATE_OPEN.includes(order.status)) throw new OrderError("The dispatch date can't change now");
  await db.transaction(async (tx) => {
    await tx.insert(schema.dispatchDateChanges).values({
      orderId: order.id,
      fromDate: order.dispatchBy,
      toDate: input.date,
      reason: input.reason.trim(),
      requestedBy: "supplier",
      status: "Agreed",
      changedBy: must(actor.userId),
      decidedBy: actor.userId,
      decidedAt: new Date(),
    });
    await moveDispatchDate(tx, order, input.date);
    await audit(tx, {
      actorId: actor.userId,
      action: "order.dispatch_date",
      resourceType: "order",
      resourceId: order.id,
      companyId: organisationId,
      before: { dispatchBy: order.dispatchBy?.toISOString() ?? null },
      after: { dispatchBy: input.date.toISOString() },
      reason: input.reason,
      context,
    });
  });
  await tell(() =>
    noticeStatus(db, order, "buyer", `${order.reference}: the supplier moved the dispatch date`, "calendar"),
  );
}

/** Moves the dispatch date; a due "before dispatch" balance moves with it (344:27740). */
async function moveDispatchDate(tx: Executor, order: OrderRow, date: Date) {
  await tx.update(o).set({ dispatchBy: date }).where(eq(o.id, order.id));
  const dispatchTriggers = Object.entries(DUE_ON)
    .filter(([, m]) => m === "dispatch")
    .map(([t]) => t);
  await tx
    .update(om)
    .set({ dueAt: date })
    .where(
      and(eq(om.orderId, order.id), inArray(om.trigger, dispatchTriggers), inArray(om.status, ["Due", "Partly paid"])),
    );
}

/** The buyer asks to change the dispatch date (344:27740): "If they agree, the balance due date moves with it." */
export async function requestDispatchDate(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { date: Date; reason: string },
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.place", { organisationId });
  if (!input.reason.trim()) throw new OrderError("Say why", { reason: "Tell the supplier why" });
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  if (!DATE_OPEN.includes(order.status)) throw new OrderError("The dispatch date can't change now");
  const [open] = await db
    .select({ id: schema.dispatchDateChanges.id })
    .from(schema.dispatchDateChanges)
    .where(and(eq(schema.dispatchDateChanges.orderId, order.id), eq(schema.dispatchDateChanges.status, "Requested")));
  if (open) throw new OrderError("You've already asked; wait for the supplier's answer");
  await db.insert(schema.dispatchDateChanges).values({
    orderId: order.id,
    fromDate: order.dispatchBy,
    toDate: input.date,
    reason: input.reason.trim(),
    requestedBy: "buyer",
    status: "Requested",
    changedBy: must(actor.userId),
  });
  await audit(db, {
    actorId: actor.userId,
    action: "order.dispatch_date_requested",
    resourceType: "order",
    resourceId: order.id,
    companyId: organisationId,
    after: { toDate: input.date.toISOString() },
    reason: input.reason,
    context,
  });
  await tell(() =>
    noticeStatus(db, order, "supplier", `${order.reference}: the buyer asked to change the dispatch date`, "calendar"),
  );
}

/** The supplier agrees to or declines the buyer's request. */
export async function decideDispatchDate(
  db: Database,
  actor: Actor,
  organisationId: string,
  requestId: string,
  agree: boolean,
  context?: RequestContext,
) {
  assertCan(actor, "order.manage", { organisationId });
  const order = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ r: schema.dispatchDateChanges, order: o })
      .from(schema.dispatchDateChanges)
      .innerJoin(o, eq(o.id, schema.dispatchDateChanges.orderId))
      .where(and(eq(schema.dispatchDateChanges.id, requestId), eq(o.supplierOrganisationId, organisationId)))
      .for("update");
    if (!row || row.r.status !== "Requested") throw new OrderError("This request was already answered");
    await tx
      .update(schema.dispatchDateChanges)
      .set({ status: agree ? "Agreed" : "Declined", decidedBy: actor.userId, decidedAt: new Date() })
      .where(eq(schema.dispatchDateChanges.id, requestId));
    if (agree && DATE_OPEN.includes(row.order.status)) await moveDispatchDate(tx, row.order, row.r.toDate);
    await audit(tx, {
      actorId: actor.userId,
      action: agree ? "order.dispatch_date_agreed" : "order.dispatch_date_declined",
      resourceType: "order",
      resourceId: row.order.id,
      companyId: organisationId,
      context,
    });
    return row.order;
  });
  await tell(() =>
    noticeStatus(
      db,
      order,
      "buyer",
      `${order.reference}: the supplier ${agree ? "agreed to" : "couldn't agree to"} the new dispatch date`,
      "calendar",
    ),
  );
}

// ------------------------------------------------------------------------------------------------ dispatch (10.9)

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
export const DELIVERY_LINK_DAYS = 14;
export const DELIVERY_CODE_TRIES = 5;

/** Whether an IRN is needed and the e-way bill threshold (OPEN: M11): the values drawn on 693:814 until the CA says. */
export const DISPATCH_RULES = defineSetting<DispatchRules>({
  key: "orders.dispatchRules",
  description: "Dispatch checklist: e-invoice IRN required, and the order value above which an e-way bill is needed",
  schema: dispatchRulesSchema,
  fallback: DRAWN_DISPATCH_RULES,
});

const PRE_DISPATCH: readonly string[] = ["Accepted", "Awaiting payment", "Ready to dispatch"];

export interface DispatchItemInput {
  invoiceNumber?: string;
  invoiceFileId?: string;
  irn?: string;
  irnAt?: Date;
  ewayBillNumber?: string;
  ewayBillFileId?: string;
  certificatesNote?: string;
  transporter?: string;
  lrNumber?: string;
  expectedAt?: Date;
}

/** Saves checklist items as the supplier adds them (693:814), before Mark as shipped. Files attach to the order. */
export async function saveDispatchDetails(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: DispatchItemInput,
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.manage", { organisationId });
  const order = await ownOrder(db, organisationId, orderId, "supplier");
  if (!PRE_DISPATCH.includes(order.status)) throw new OrderError("The checklist is closed once the order ships");
  const clean = (v?: string) => (v === undefined ? undefined : v.trim() || null);
  const values = {
    invoiceNumber: clean(input.invoiceNumber),
    invoiceFileId: input.invoiceFileId,
    irn: clean(input.irn),
    irnAt: input.irnAt ?? (input.irn?.trim() ? new Date() : undefined),
    ewayBillNumber: clean(input.ewayBillNumber),
    ewayBillFileId: input.ewayBillFileId,
    certificatesNote: clean(input.certificatesNote),
    certificatesAt: input.certificatesNote?.trim() ? new Date() : undefined,
    transporter: clean(input.transporter),
    lrNumber: clean(input.lrNumber),
    expectedAt: input.expectedAt,
  };
  const set = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
  await db.transaction(async (tx) => {
    for (const fileId of [input.invoiceFileId, input.ewayBillFileId].filter((x): x is string => Boolean(x))) {
      await attachFile(tx, { actor, fileId, kind: "order_document", attachedType: "order", attachedId: order.id });
    }
    await tx
      .insert(schema.shipments)
      .values({ orderId: order.id, ...set })
      .onConflictDoUpdate({ target: schema.shipments.orderId, set: { ...set, updatedAt: new Date() } });
    await audit(tx, {
      actorId: actor.userId,
      action: "order.dispatch_details",
      resourceType: "order",
      resourceId: order.id,
      companyId: organisationId,
      after: Object.fromEntries(Object.keys(set).map((k) => [k, "saved"])),
      context,
    });
  });
}

/** The checklist as the page and the server see it. */
export async function checklistFor(ex: Executor, order: OrderRow, buyerName: string) {
  const [shipment] = await ex.select().from(schema.shipments).where(eq(schema.shipments.orderId, order.id));
  const rules = await getSetting(ex, DISPATCH_RULES);
  return {
    shipment: shipment ?? null,
    items: dispatchChecklist(shipment ?? null, { totalPaise: order.totalPaise, buyerName }, rules, formatIstDate),
  };
}

/**
 * Mark as shipped (693:814): every checklist item done and everything due before dispatch paid. Tells the receiving
 * contact by SMS (668:270) that it's on its way; the delivery code follows with proof of delivery.
 */
export async function dispatchOrder(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.manage", { organisationId });
  const order = await ownOrder(db, organisationId, orderId, "supplier");
  if (order.status !== "Ready to dispatch") throw new OrderError("This order isn't ready to dispatch");
  if (!(await paidForDispatch(db, order.id))) throw new OrderError("The buyer hasn't paid what's due before dispatch");
  const names = await companyNames(db, order);
  const { items, shipment } = await checklistFor(db, order, names.buyer);
  const left = itemsLeft(items);
  if (left || !shipment) throw new OrderError(left || "Complete the dispatch checklist");
  await db.transaction(async (tx) => {
    await tx
      .update(schema.shipments)
      .set({ shippedAt: new Date(), shippedBy: actor.userId, updatedAt: new Date() })
      .where(eq(schema.shipments.orderId, order.id));
    await moveOrder(
      tx,
      actor.userId,
      order,
      { from: "Ready to dispatch", to: "Shipped" },
      {
        context,
        also: async (t) => {
          await t.update(o).set({ shippedAt: new Date() }).where(eq(o.id, order.id));
        },
      },
    );
  });
  if (order.receiverMobile && shipment.transporter && shipment.lrNumber && shipment.expectedAt) {
    const carrier = shipment.transporter;
    const lr = shipment.lrNumber;
    const expected = formatIstDayMonth(shipment.expectedAt);
    await tell(() =>
      deliverSms({
        template: "sms.order_dispatched_receiving_contact",
        event: "order.dispatched",
        to: `+91${must(order.receiverMobile)}`,
        data: { order: order.reference, supplier: names.supplier, carrier, lr, expected },
      }),
    );
  }
  await tell(() =>
    noticeDispatched(db, order, {
      supplier: names.supplier,
      carrier: shipment.transporter ?? "",
      lr: shipment.lrNumber ?? "",
      expected: shipment.expectedAt ? formatIstDayMonth(shipment.expectedAt) : "",
    }),
  );
}

async function companyNames(ex: Executor, order: OrderRow) {
  const name = async (id: string) => {
    const [row] = await ex
      .select({ legal: schema.organisations.legalName, trade: schema.companyProfiles.tradeName })
      .from(schema.organisations)
      .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
      .where(eq(schema.organisations.id, id));
    return row?.trade ?? row?.legal ?? "";
  };
  return { buyer: await name(order.buyerOrganisationId), supplier: await name(order.supplierOrganisationId) };
}

/** A new single-use link and code; earlier ones stop working. Returns them so tests can use them. */
async function issueDeliveryCode(tx: Executor, orderId: string) {
  const token = randomBytes(8).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await tx
    .update(schema.deliveryLinks)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.deliveryLinks.orderId, orderId), isNull(schema.deliveryLinks.usedAt)));
  await tx.insert(schema.deliveryLinks).values({
    orderId,
    tokenHash: sha(token),
    codeHash: sha(`${orderId}:${code}`),
    expiresAt: new Date(Date.now() + DELIVERY_LINK_DAYS * 86_400_000),
  });
  return { token, code };
}

async function sendDeliveryCode(db: Database, order: OrderRow, issued: { token: string; code: string }) {
  if (!order.receiverMobile) return;
  const names = await companyNames(db, order);
  const base = parseServerEnv()
    .APP_URL.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  await deliverSms({
    template: "sms.otp_delivery_receiving_contact",
    event: "order.delivery_code",
    to: `+91${order.receiverMobile}`,
    data: { order: order.reference, supplier: names.supplier, link: `${base}/d/${issued.token}`, code: issued.code },
  });
  await db.update(schema.shipments).set({ codeSentAt: new Date() }).where(eq(schema.shipments.orderId, order.id));
}

/**
 * Upload proof of delivery (308:6627): "Once uploaded, the buyer has 5 working days to accept". The order is Delivered,
 * the acceptance clock starts, and the receiving contact gets the code (668:232) to confirm what arrived (695:13).
 */
export async function uploadProofOfDelivery(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { fileIds: string[]; deliveredOn: Date; receivedBy: string },
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.manage", { organisationId });
  const errors: Record<string, string> = {};
  if (!input.fileIds.length) errors.files = "Upload the signed delivery note or POD";
  if (!input.receivedBy.trim()) errors.receivedBy = "Say who received it";
  if (input.deliveredOn.getTime() > Date.now() + 86_400_000)
    errors.deliveredOn = "The delivery date can't be in the future";
  if (Object.keys(errors).length) throw new OrderError("Check the highlighted fields", errors);
  const order = await ownOrder(db, organisationId, orderId, "supplier");
  if (order.status !== "Shipped") throw new OrderError("This order isn't in transit");
  const issued = await db.transaction(async (tx) => {
    for (const fileId of input.fileIds)
      await attachFile(tx, { actor, fileId, kind: "order_document", attachedType: "order", attachedId: order.id });
    await tx
      .update(schema.shipments)
      .set({
        podFileIds: input.fileIds,
        podAt: new Date(),
        deliveredOn: input.deliveredOn,
        receivedBy: input.receivedBy.trim(),
        updatedAt: new Date(),
      })
      .where(eq(schema.shipments.orderId, order.id));
    await moveOrder(
      tx,
      actor.userId,
      order,
      { from: "Shipped", to: "Delivered" },
      {
        context,
        reason: `Proof of delivery uploaded; received by ${input.receivedBy.trim()}`,
        also: async (t) => {
          await t.update(o).set({ deliveredAt: input.deliveredOn }).where(eq(o.id, order.id));
          await startClock(t, { clock: BUYER_CLOCK, subjectType: "order", subjectId: order.id });
          await makeDue(t, order.id, "receipt");
        },
      },
    );
    return issueDeliveryCode(tx, order.id);
  });
  await tell(() => sendDeliveryCode(db, order, issued));
  await tell(() =>
    noticeStatus(
      db,
      order,
      "buyer",
      `${order.reference} was delivered. Accept it or report a problem`,
      "package-check",
    ),
  );
  return issued;
}

/** Sends a fresh code (G5 fallback: an operator resends). The old link stops working. */
export async function resendDeliveryCode(db: Database, actor: Actor, orderId: string, reason: string) {
  if (!actor.operator.has("orders.edit")) throw new OrderError("Not allowed");
  if (!reason.trim()) throw new OrderError("Say why");
  const [order] = await db.select().from(o).where(eq(o.id, orderId));
  if (!order || order.status !== "Delivered") throw new OrderError("This order isn't waiting for the delivery code");
  const issued = await db.transaction(async (tx) => {
    await audit(tx, {
      actorId: actor.userId,
      action: "order.delivery_code_resent",
      resourceType: "order",
      resourceId: orderId,
      reason,
    });
    return issueDeliveryCode(tx, orderId);
  });
  await sendDeliveryCode(db, order, issued);
  return issued;
}

/** What the delivery page may show (695:13): the order reference and items only, never prices. */
export async function deliveryLink(db: Database, token: string) {
  const [link] = await db
    .select()
    .from(schema.deliveryLinks)
    .where(eq(schema.deliveryLinks.tokenHash, sha(token)));
  if (!link) return { state: "invalid" as const };
  if (link.usedAt) return { state: "used" as const };
  if (link.lockedAt) return { state: "locked" as const };
  if (link.expiresAt < new Date()) return { state: "expired" as const };
  const [order] = await db.select({ reference: o.reference, status: o.status }).from(o).where(eq(o.id, link.orderId));
  const items = await db
    .select({
      description: schema.orderLines.description,
      quantity: schema.orderLines.quantity,
      unit: schema.orderLines.unit,
    })
    .from(schema.orderLines)
    .where(eq(schema.orderLines.orderId, link.orderId))
    .orderBy(asc(schema.orderLines.position));
  return { state: "open" as const, reference: order?.reference ?? "", items };
}

export const RECEIPT_CONDITIONS = ["Good", "Damaged", "Short"] as const;
export const MAX_RECEIPT_PHOTOS = 5;

/**
 * Record what arrived (695:110) with the code: "Delivery code confirmed" (693:814 step 4). Five wrong codes lock the
 * link and alert Operations. The buyer still accepts or reports a problem on the order.
 */
export async function recordReceipt(
  db: Database,
  input: {
    token: string;
    code: string;
    condition: (typeof RECEIPT_CONDITIONS)[number];
    notes?: string;
    /** Photos uploaded on the page without an account: each with the upload key that proves who sent it. */
    photos?: { fileId: string; key: string }[];
    receivedBy?: string;
  },
) {
  if (!RECEIPT_CONDITIONS.includes(input.condition)) throw new OrderError("Choose the condition");
  if ((input.photos?.length ?? 0) > MAX_RECEIPT_PHOTOS) throw new OrderError("Up to 5 photos");
  if (input.condition !== "Good" && !input.notes?.trim())
    throw new OrderError("Say what's wrong", { notes: "Describe the damage or what's missing" });
  const result = await db.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(schema.deliveryLinks)
      .where(eq(schema.deliveryLinks.tokenHash, sha(input.token)))
      .for("update");
    if (!link || link.usedAt || link.lockedAt || link.expiresAt < new Date())
      return { ok: false as const, state: "closed" };
    if (sha(`${link.orderId}:${input.code.trim()}`) !== link.codeHash) {
      const tries = link.wrongTries + 1;
      await tx
        .update(schema.deliveryLinks)
        .set({ wrongTries: tries, lockedAt: tries >= DELIVERY_CODE_TRIES ? new Date() : null })
        .where(eq(schema.deliveryLinks.id, link.id));
      if (tries >= DELIVERY_CODE_TRIES) {
        await audit(tx, {
          actorId: null,
          action: "order.delivery_link_locked",
          resourceType: "order",
          resourceId: link.orderId,
          reason: "Five wrong delivery codes",
        });
      }
      return {
        ok: false as const,
        state: tries >= DELIVERY_CODE_TRIES ? "locked" : "wrong",
        left: DELIVERY_CODE_TRIES - tries,
      };
    }
    const [order] = await tx.select().from(o).where(eq(o.id, link.orderId)).for("update");
    if (!order || order.status !== "Delivered") return { ok: false as const, state: "closed" };
    await tx.update(schema.deliveryLinks).set({ usedAt: new Date() }).where(eq(schema.deliveryLinks.id, link.id));
    for (const p of input.photos ?? [])
      await attachFile(tx, {
        actor: VISITOR,
        key: p.key,
        fileId: p.fileId,
        kind: "delivery_photo",
        attachedType: "order",
        attachedId: order.id,
      });
    await receive(tx, order, {
      condition: input.condition,
      notes: input.notes ?? null,
      photoFileIds: (input.photos ?? []).map((p) => p.fileId),
      receivedBy: input.receivedBy ?? null,
      via: "link",
      recordedBy: null,
      reason: null,
    });
    return { ok: true as const, order };
  });
  if (result.ok) {
    await tell(() =>
      noticeStatus(
        db,
        result.order,
        "buyer",
        `${result.order.reference}: your receiving contact confirmed the delivery (${input.condition})`,
        "package-check",
      ),
    );
  }
  return result;
}

async function receive(
  tx: Executor,
  order: OrderRow,
  r: {
    condition: string;
    notes: string | null;
    photoFileIds: string[];
    receivedBy: string | null;
    via: string;
    recordedBy: string | null;
    reason: string | null;
  },
) {
  const [have] = await tx.select().from(schema.deliveryReceipts).where(eq(schema.deliveryReceipts.orderId, order.id));
  if (have) throw new OrderError("The delivery was already confirmed");
  await tx.insert(schema.deliveryReceipts).values({ orderId: order.id, ...r });
  await audit(tx, {
    actorId: r.recordedBy,
    action: "order.receipt_recorded",
    resourceType: "order",
    resourceId: order.id,
    companyId: order.buyerOrganisationId,
    after: { condition: r.condition, via: r.via, photos: r.photoFileIds.length },
    reason: r.reason ?? undefined,
  });
}

/** G5 fallback: an operator confirms receipt with a reason (audited) when the code never arrived. */
export async function operatorConfirmReceipt(
  db: Database,
  actor: Actor,
  orderId: string,
  input: { condition: (typeof RECEIPT_CONDITIONS)[number]; reason: string },
) {
  if (!actor.operator.has("orders.edit")) throw new OrderError("Not allowed");
  if (!input.reason.trim()) throw new OrderError("Say why");
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(o).where(eq(o.id, orderId)).for("update");
    if (!order || order.status !== "Delivered") throw new OrderError("This order isn't waiting for the delivery code");
    await receive(tx, order, {
      condition: input.condition,
      notes: null,
      photoFileIds: [],
      receivedBy: null,
      via: "operator",
      recordedBy: actor.userId,
      reason: input.reason,
    });
  });
}

// ------------------------------------------------------------------------------------------------ acceptance (10.10)

/** Accept the delivery (330:27033): everything held is released; payout 2 working days later. */
export async function acceptDelivery(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.place", { organisationId });
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  if (order.status !== "Delivered") throw new OrderError("This order isn't waiting for your acceptance");
  await db.transaction(async (tx) => {
    await moveOrder(
      tx,
      actor.userId,
      order,
      { from: "Delivered", to: "Accepted by buyer" },
      {
        context,
        also: async (t) => {
          await t.update(o).set({ buyerAcceptedAt: new Date() }).where(eq(o.id, order.id));
          await completeDeadline(t, { type: BUYER_CLOCK, subjectType: "order", subjectId: order.id });
          await makeDue(t, order.id, "acceptance");
          await release(t, order, await heldOn(t, order.id), "acceptance");
        },
      },
    );
  });
  await tell(() =>
    noticeStatus(
      db,
      order,
      "supplier",
      `${order.reference}: the buyer accepted the delivery. Payout is on its way`,
      "check-circle",
    ),
  );
}

/**
 * Accept part and report a problem (697:8): releases exactly the accepted amount, holds the rest and opens a dispute
 * for it. With acceptedPaise 0 it is Report a problem (330:27342) for the whole order.
 */
export async function reportProblem(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { reason: string; details: string; fix?: string; acceptedPaise?: bigint; photoFileIds?: string[] },
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.place", { organisationId });
  const errors: Record<string, string> = {};
  if (!input.reason.trim()) errors.reason = "Say what went wrong";
  if (!input.details.trim()) errors.details = "Describe the problem";
  if (Object.keys(errors).length) throw new OrderError("Check the highlighted fields", errors);
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  if (order.status !== "Delivered") throw new OrderError("You can report a problem once the order is delivered");
  const dispute = await db.transaction(async (tx) => {
    const held = await heldOn(tx, order.id);
    const accepted = input.acceptedPaise ?? 0n;
    if (accepted < 0n || accepted > held) throw new OrderError("The accepted amount is more than what's held");
    const reference = await nextReference(tx, "DSP");
    const [d] = await tx
      .insert(schema.disputes)
      .values({
        reference,
        orderId: order.id,
        reason: input.reason,
        details: input.details.trim(),
        wantedFix: input.fix?.trim() || null,
        photoFileIds: input.photoFileIds ?? [],
        disputedPaise: held - accepted,
        acceptedPaise: accepted,
        openedBy: must(actor.userId),
      })
      .returning();
    if (accepted > 0n) await release(tx, order, accepted, `part:${must(d).id}`);
    await moveOrder(
      tx,
      actor.userId,
      order,
      { from: "Delivered", to: "Disputed" },
      {
        context,
        reason: input.reason,
        also: async (t) => {
          await completeDeadline(t, { type: BUYER_CLOCK, subjectType: "order", subjectId: order.id });
          await startClock(t, { clock: "disputeSupplierReply", subjectType: "dispute", subjectId: must(d).id });
        },
      },
    );
    return must(d);
  });
  const replyBy = await db
    .select({ dueAt: schema.deadlines.dueAt })
    .from(schema.deadlines)
    .where(and(eq(schema.deadlines.subjectId, dispute.id), eq(schema.deadlines.type, "disputeSupplierReply")));
  const buyerName = (await companyNames(db, order)).buyer;
  await tell(() =>
    noticeDisputeOpened(db, order, {
      buyer: buyerName,
      dispute: dispute.reference,
      held: dispute.disputedPaise,
      replyBy: replyBy[0]?.dueAt ? formatIstDateTime(replyBy[0].dueAt) : "2 working days",
    }),
  );
  return dispute;
}

export const DISPUTE_OFFERS = ["replace", "partial_refund", "disagree"] as const;
export type DisputeOffer = (typeof DISPUTE_OFFERS)[number];

/**
 * The supplier's response (813:12602): replace at their cost, offer a partial refund, or disagree and explain, with
 * photos or documents. The buyer can accept the offer; either side can ask H2 Economy to decide.
 */
export async function replyToDispute(
  db: Database,
  actor: Actor,
  organisationId: string,
  disputeId: string,
  input: { offer: DisputeOffer; reply: string; refundPaise?: bigint; fileIds?: string[] },
  context?: RequestContext,
) {
  assertCan(actor, "order.manage", { organisationId });
  const errors: Record<string, string> = {};
  if (!DISPUTE_OFFERS.includes(input.offer)) errors.offer = "Choose your response";
  if (!input.reply.trim()) errors.reply = "Explain your response";
  if (input.reply.length > 1000) errors.reply = "Keep it under 1,000 characters";
  const [row] = await db
    .select({ d: schema.disputes, order: o })
    .from(schema.disputes)
    .innerJoin(o, eq(o.id, schema.disputes.orderId))
    .where(and(eq(schema.disputes.id, disputeId), eq(o.supplierOrganisationId, organisationId)));
  if (!row || row.d.status !== "Open") throw new OrderError("This dispute isn't waiting for your reply");
  if (input.offer === "partial_refund") {
    const r = input.refundPaise ?? 0n;
    if (r <= 0n || r > row.d.disputedPaise) errors.refund = "Offer a refund up to the amount held";
  }
  if (Object.keys(errors).length) throw new OrderError("Check your response", errors);
  await db.transaction(async (tx) => {
    for (const fileId of input.fileIds ?? [])
      await attachFile(tx, { actor, fileId, kind: "order_document", attachedType: "order", attachedId: row.order.id });
    await tx
      .update(schema.disputes)
      .set({
        offer: input.offer,
        offerRefundPaise: input.offer === "partial_refund" ? (input.refundPaise ?? null) : null,
        supplierReply: input.reply.trim(),
        supplierFileIds: input.fileIds ?? [],
        supplierRepliedAt: new Date(),
        status: "Supplier replied",
        updatedAt: new Date(),
      })
      .where(eq(schema.disputes.id, disputeId));
    await completeDeadline(tx, { type: "disputeSupplierReply", subjectType: "dispute", subjectId: disputeId });
    await startClock(tx, { clock: "disputeReview", subjectType: "dispute", subjectId: disputeId });
    await audit(tx, {
      actorId: actor.userId,
      action: "dispute.replied",
      resourceType: "dispute",
      resourceId: disputeId,
      companyId: organisationId,
      after: { offer: input.offer, refundPaise: input.refundPaise?.toString() ?? null },
      context,
    });
  });
  await tell(() =>
    noticeStatus(db, row.order, "buyer", `${row.d.reference}: the supplier responded to your report`, "message-square"),
  );
}

/**
 * The buyer accepts the supplier's offer: a partial refund is refunded and the rest released; a replacement or
 * repair releases the held amount (the supplier fixes it at their cost). The order ends Accepted by buyer.
 */
export async function acceptDisputeOffer(
  db: Database,
  actor: Actor,
  organisationId: string,
  disputeId: string,
  context?: RequestContext,
) {
  assertCan(actor, "order.place", { organisationId });
  const order = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ d: schema.disputes, order: o })
      .from(schema.disputes)
      .innerJoin(o, eq(o.id, schema.disputes.orderId))
      .where(and(eq(schema.disputes.id, disputeId), eq(o.buyerOrganisationId, organisationId)))
      .for("update");
    if (!row || row.d.status !== "Supplier replied" || !row.d.offer || row.d.offer === "disagree")
      throw new OrderError("There's no offer to accept");
    const refundAmount = row.d.offer === "partial_refund" ? (row.d.offerRefundPaise ?? 0n) : 0n;
    if (refundAmount > 0n)
      await refund(tx, row.order, {
        amountPaise: refundAmount,
        reason: `Dispute ${row.d.reference}: partial refund agreed`,
        disputeId: row.d.id,
        requestedBy: actor.userId,
      });
    await release(tx, row.order, row.d.disputedPaise - refundAmount, `dispute:${row.d.id}`);
    await tx
      .update(schema.disputes)
      .set({
        status: "Resolved",
        outcome: refundAmount > 0n ? "split" : "release_supplier",
        refundPaise: refundAmount,
        decisionNote: "The buyer accepted the supplier's offer",
        decidedBy: actor.userId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.disputes.id, row.d.id));
    await completeDeadline(tx, { type: "disputeReview", subjectType: "dispute", subjectId: row.d.id });
    await moveOrder(
      tx,
      actor.userId,
      row.order,
      { from: "Disputed", to: "Accepted by buyer" },
      {
        context,
        reason: `Offer accepted (${row.d.reference})`,
        also: async (t) => {
          await t.update(o).set({ buyerAcceptedAt: new Date() }).where(eq(o.id, row.order.id));
        },
      },
    );
    return row.order;
  });
  await tell(() =>
    noticeStatus(db, order, "supplier", `${order.reference}: the buyer accepted your offer`, "check-circle"),
  );
}

/** "Ask H2 Economy to decide" (813:12602): either side moves the dispute to Under review for an operator (11.5). */
export async function escalateDispute(
  db: Database,
  actor: Actor,
  organisationId: string,
  disputeId: string,
  context?: RequestContext,
) {
  const [row] = await db
    .select({ d: schema.disputes, order: o })
    .from(schema.disputes)
    .innerJoin(o, eq(o.id, schema.disputes.orderId))
    .where(eq(schema.disputes.id, disputeId));
  if (!row) throw new OrderError("No such dispute");
  const side =
    row.order.buyerOrganisationId === organisationId
      ? "buyer"
      : row.order.supplierOrganisationId === organisationId
        ? "supplier"
        : null;
  if (!side) throw new OrderError("No such dispute");
  assertCan(actor, side === "buyer" ? "order.place" : "order.manage", { organisationId });
  if (row.d.status === "Resolved" || row.d.status === "Under review")
    throw new OrderError("H2 Economy is already on it");
  await db
    .update(schema.disputes)
    .set({ status: "Under review", escalatedBy: side, escalatedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.disputes.id, disputeId));
  await audit(db, {
    actorId: actor.userId,
    action: "dispute.escalated",
    resourceType: "dispute",
    resourceId: disputeId,
    companyId: organisationId,
    after: { by: side },
    context,
  });
}

/**
 * An operator decides a dispute (11.5): refund the buyer, release to the supplier, or split. The disputed amount was
 * held until now; the order ends Accepted by buyer (some released) or Cancelled (all refunded).
 */
export async function decideDispute(
  db: Database,
  actor: Actor,
  disputeId: string,
  input: { outcome: "refund_buyer" | "release_supplier" | "split"; refundPaise?: bigint; note: string },
  context?: RequestContext,
) {
  if (!actor.operator.has("orders.edit")) throw new OrderError("Not allowed");
  if (!input.note.trim()) throw new OrderError("Explain the decision", { note: "Explain the decision" });
  const result = await db.transaction(async (tx) => {
    const [d] = await tx.select().from(schema.disputes).where(eq(schema.disputes.id, disputeId)).for("update");
    if (!d || d.status === "Resolved") throw new OrderError("This dispute is already decided");
    const [order] = await tx.select().from(o).where(eq(o.id, d.orderId)).for("update");
    if (!order) throw new OrderError("No such order");
    const disputed = d.disputedPaise;
    const refundAmount =
      input.outcome === "refund_buyer"
        ? disputed
        : input.outcome === "release_supplier"
          ? 0n
          : (input.refundPaise ?? 0n);
    if (refundAmount < 0n || refundAmount > disputed)
      throw new OrderError("The refund is more than the disputed amount");
    const releaseAmount = disputed - refundAmount;
    if (refundAmount > 0n)
      await refund(tx, order, {
        amountPaise: refundAmount,
        reason: `Dispute ${d.reference}: ${input.note}`,
        disputeId: d.id,
        requestedBy: actor.userId,
      });
    if (releaseAmount > 0n) await release(tx, order, releaseAmount, `dispute:${d.id}`);
    await tx
      .update(schema.disputes)
      .set({
        status: "Resolved",
        outcome: input.outcome,
        refundPaise: refundAmount,
        decisionNote: input.note.trim(),
        decidedBy: actor.userId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.disputes.id, d.id));
    await completeDeadline(tx, { type: "disputeReview", subjectType: "dispute", subjectId: d.id });
    await cancelDeadline(tx, { type: "disputeSupplierReply", subjectType: "dispute", subjectId: d.id });
    const nothingReleased = releaseAmount === 0n && d.acceptedPaise === 0n;
    await moveOrder(
      tx,
      actor.userId,
      order,
      { from: "Disputed", to: nothingReleased ? "Cancelled" : "Accepted by buyer" },
      {
        context,
        reason: `Dispute ${d.reference}: ${input.outcome}`,
        also: async (t) => {
          if (nothingReleased)
            await t
              .update(o)
              .set({ cancelledAt: new Date(), cancelReason: `Dispute ${d.reference}` })
              .where(eq(o.id, order.id));
          else await t.update(o).set({ buyerAcceptedAt: new Date() }).where(eq(o.id, order.id));
        },
      },
    );
    return order;
  });
  await tell(() => noticeStatus(db, result, "buyer", `${result.reference}: the dispute was decided`, "scale"));
  await tell(() => noticeStatus(db, result, "supplier", `${result.reference}: the dispute was decided`, "scale"));
}

/**
 * Cancel (330:27379). The cancellation rules by moment are Doc 4's table, not yet given (OPEN: G9, Doc 4); the safe
 * default: the buyer may cancel until the order ships, and every confirmed payment is refunded in full. After it
 * ships, only an operator decides (dispute).
 */
export async function cancelOrder(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  reason: string,
  context?: RequestContext,
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.place", { organisationId });
  if (!reason.trim()) throw new OrderError("Say why", { reason: "Tell the supplier why you're cancelling" });
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  const from = order.status as OrderStatus;
  if (!["Awaiting approval", "Pending acceptance", "Accepted", "Awaiting payment", "Ready to dispatch"].includes(from))
    throw new OrderError("This order can't be cancelled now");
  await db.transaction(async (tx) => {
    const held = await heldOn(tx, order.id);
    if (held > 0n)
      await refund(tx, order, { amountPaise: held, reason: `Cancelled: ${reason}`, requestedBy: actor.userId });
    await moveOrder(tx, actor.userId, order, { from, to: "Cancelled" } as never, {
      context,
      reason,
      also: async (t) => {
        await t.update(o).set({ cancelledAt: new Date(), cancelReason: reason }).where(eq(o.id, order.id));
        await cancelDeadline(t, { type: ACCEPT_CLOCK, subjectType: "order", subjectId: order.id });
        await restock(t, order.id);
      },
    });
  });
  await tell(() =>
    noticeStatus(db, order, "supplier", `${order.reference} was cancelled by the buyer: ${reason}`, "x-circle"),
  );
}

// ------------------------------------------------------------------------------------------------ clocks

// 48 hours without an answer: the order shows Overdue (derived) and appears for Operations (11.5). Nothing is declined
// automatically (10.7 default). Five working days without acceptance: a reminder; no automatic acceptance (G13
// default).
onDeadline(ACCEPT_CLOCK, async (tx, deadline, event) => {
  if (event !== "expire") return;
  await audit(tx, {
    actorId: null,
    action: "order.acceptance_overdue",
    resourceType: "order",
    resourceId: deadline.subjectId,
    reason: "The supplier hasn't answered in 48 hours",
  });
});

onDeadline(BUYER_CLOCK, async (tx, deadline, event) => {
  if (event !== "expire") return;
  await audit(tx, {
    actorId: null,
    action: "order.buyer_acceptance_overdue",
    resourceType: "order",
    resourceId: deadline.subjectId,
    reason: "Five working days since delivery without acceptance (G13: reminder only)",
  });
});

/** Orders that need Operations (11.5): overdue supplier answers, locked delivery links, open disputes. */
export async function ordersNeedingOperations(db: Database) {
  const d = schema.deadlines;
  return db
    .select({ id: o.id, reference: o.reference, status: o.status })
    .from(o)
    .where(
      or(
        and(
          eq(o.status, "Pending acceptance"),
          sql`exists (select 1 from ${d} where ${d.subjectId} = core.orders.id::text and ${d.type} = ${ACCEPT_CLOCK} and ${d.status} = 'Open' and ${d.dueAt} < now())`,
        ),
        eq(o.status, "Disputed"),
        sql`exists (select 1 from core.delivery_links l where l.order_id = core.orders.id and l.locked_at is not null and l.used_at is null)`,
      ),
    );
}

// ------------------------------------------------------------------------------------------------ rating (G12)

/** The buyer rates a completed order, once (G12): 1 to 5 and an optional comment the supplier sees. */
export async function rateOrder(
  db: Database,
  actor: Actor,
  organisationId: string,
  orderId: string,
  input: { rating: number; comment?: string },
  context?: RequestContext,
) {
  assertCan(actor, "order.place", { organisationId });
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    throw new OrderError("Choose 1 to 5", { rating: "Choose 1 to 5" });
  if ((input.comment?.length ?? 0) > 1000) throw new OrderError("Keep it to 1,000 characters");
  const order = await ownOrder(db, organisationId, orderId, "buyer");
  if (order.status !== "Accepted by buyer" && order.status !== "Closed")
    throw new OrderError("You can rate an order once you've accepted the delivery");
  const [row] = await db
    .insert(schema.orderRatings)
    .values({
      orderId: order.id,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      ratedBy: must(actor.userId),
    })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new OrderError("You've already rated this order");
  await audit(db, {
    actorId: actor.userId,
    action: "order.rated",
    resourceType: "order",
    resourceId: order.id,
    companyId: order.supplierOrganisationId,
    after: { rating: input.rating },
    context,
  });
  await tell(() =>
    noticeStatus(
      db,
      order,
      "supplier",
      `${order.reference}: the buyer rated the order ${String(input.rating)} of 5`,
      "check-circle",
    ),
  );
}

export async function ratingOf(db: Database, orderId: string) {
  const [row] = await db.select().from(schema.orderRatings).where(eq(schema.orderRatings.orderId, orderId));
  return row ?? null;
}
