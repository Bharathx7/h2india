import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { startClock } from "../clocks/clocks";
import { orderLedgerProblems, post, monthlyIdentity } from "../ledger";
import { nextReference } from "../reference";
import { paymentPartner, simDueWebhooks, simMarkDelivered, type WebhookEvent } from "../adapters/payments";
import { nextPayoutRun, settle } from "./fees";
import {
  calendar,
  makeDue,
  moveOrder,
  o,
  om,
  OrderError,
  ownOrder,
  paidThrough,
  rateCardVersion,
  tell,
  type OrderRow,
} from "./records";
import { noticePaymentReceived, noticePayoutSent, noticeRefund } from "./notices";
import { must } from "../must";

// Money on an order (steps 10.4 to 10.6, 10.10, 10.11). Buyers pay into the order's own account at the partner (bank
// transfer) or through hosted checkout; a payment counts only when the partner confirms it by webhook (or the
// reconciliation finds it). Every movement posts a balanced ledger transaction in the same database transaction as the
// order change, keyed by the partner's event id, so a duplicate webhook changes nothing.

const p = schema.payments;

// ------------------------------------------------------------------------------------------------ paying

/** The order's own account for bank transfers (690:9). Never the supplier's bank details. Created once. */
export async function orderAccount(ex: Executor, order: OrderRow) {
  const [have] = await ex.select().from(schema.orderAccounts).where(eq(schema.orderAccounts.orderId, order.id));
  if (have) return have;
  const partner = paymentPartner();
  const acc = await partner.createOrderAccount({ orderRef: order.reference, amountPaise: order.totalPaise });
  const [row] = await ex
    .insert(schema.orderAccounts)
    .values({
      orderId: order.id,
      accountNumber: acc.accountNo,
      ifsc: acc.ifsc,
      payeeName: acc.payeeName,
      partner: partner.name,
    })
    .onConflictDoNothing()
    .returning();
  return (
    row ?? must((await ex.select().from(schema.orderAccounts).where(eq(schema.orderAccounts.orderId, order.id)))[0])
  );
}

/** Retry limit for online payments on one milestone (691:788 "retry limit reached"). */
export const PAYMENT_RETRY_LIMIT = 3;

/** Starts hosted checkout for the next due milestone (792:15399). Nothing is charged until the partner confirms. */
export async function startOnlinePayment(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { orderId: string; milestoneId: string; method: "upi" | "card" | "netbanking" },
  context?: RequestContext,
) {
  assertCan(actor, "order.place", { organisationId });
  const order = await ownOrder(db, organisationId, input.orderId, "buyer");
  const [m] = await db
    .select()
    .from(om)
    .where(and(eq(om.id, input.milestoneId), eq(om.orderId, order.id)));
  if (!m || (m.status !== "Due" && m.status !== "Partly paid")) throw new OrderError("This payment isn't due");
  const attempts = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(p)
    .where(and(eq(p.milestoneId, m.id), inArray(p.status, ["Failed", "Timed out"])));
  if ((attempts[0]?.n ?? 0) >= PAYMENT_RETRY_LIMIT) throw new OrderError("retry_limit");
  const amount = m.amountPaise - m.paidPaise;
  const attempt = (attempts[0]?.n ?? 0) + 1;
  const partner = paymentPartner();
  const checkout = await partner.createCheckout(
    { orderRef: order.reference, milestoneId: m.id, amountPaise: amount, method: input.method },
    `checkout:${m.id}:${String(attempt)}`,
  );
  await db
    .insert(p)
    .values({
      orderId: order.id,
      milestoneId: m.id,
      method: input.method,
      partner: partner.name,
      partnerPaymentId: checkout.paymentId,
      checkoutUrl: checkout.checkoutUrl,
      amountPaise: amount,
      attempt,
    })
    .onConflictDoNothing();
  await audit(db, {
    actorId: actor.userId,
    action: "payment.checkout",
    resourceType: "order",
    resourceId: order.id,
    companyId: organisationId,
    after: { milestone: m.position, amountPaise: amount.toString(), method: input.method },
    context,
  });
  return checkout;
}

// ------------------------------------------------------------------------------------------------ webhooks

export class WebhookRejected extends Error {
  readonly code = "WEBHOOK_REJECTED";
}

/**
 * The webhook pipeline (playbook Section 9): verify the signature, store the event unique by its id, then process it
 * once. Returns "processed", "duplicate" or "stored" (stored but not processed: it failed and will be retried).
 */
export async function receiveWebhook(db: Database, rawBody: string, signature: string | null) {
  const partner = paymentPartner();
  if (!partner.verifyWebhook(rawBody, signature)) throw new WebhookRejected("Bad signature");
  const event = JSON.parse(rawBody) as Partial<WebhookEvent>;
  if (typeof event.id !== "string" || typeof event.type !== "string" || typeof event.data !== "object")
    throw new WebhookRejected("Not an event");
  const [stored] = await db
    .insert(schema.paymentWebhookEvents)
    .values({ partner: partner.name, eventId: event.id, type: event.type, payload: event as Record<string, unknown> })
    .onConflictDoNothing({ target: schema.paymentWebhookEvents.eventId })
    .returning();
  if (!stored) {
    const [seen] = await db
      .select()
      .from(schema.paymentWebhookEvents)
      .where(eq(schema.paymentWebhookEvents.eventId, event.id));
    if (seen?.processedAt) return "duplicate" as const;
  }
  return processEvent(db, event as WebhookEvent);
}

/** Processes a stored event; safe to call again (the ledger and the processed mark make it happen once). */
export async function processEvent(db: Database, event: WebhookEvent) {
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.paymentWebhookEvents)
        .where(eq(schema.paymentWebhookEvents.eventId, event.id))
        .for("update");
      if (row?.processedAt) return;
      await apply(tx, event);
      await tx
        .update(schema.paymentWebhookEvents)
        .set({ processedAt: new Date(), error: null })
        .where(eq(schema.paymentWebhookEvents.eventId, event.id));
    });
    await after(db, event);
    return "processed" as const;
  } catch (error) {
    await db
      .update(schema.paymentWebhookEvents)
      .set({ error: error instanceof Error ? error.message : String(error) })
      .where(eq(schema.paymentWebhookEvents.eventId, event.id));
    console.error("payments: webhook failed", event.type, error);
    return "stored" as const;
  }
}

async function orderByRef(tx: Executor, ref: string | undefined) {
  if (!ref) throw new Error("Event has no order reference");
  const [row] = await tx.select().from(o).where(eq(o.reference, ref)).for("update");
  if (!row) throw new Error(`No order ${ref}`);
  return row;
}

async function apply(tx: Executor, ev: WebhookEvent) {
  const amount = ev.data.amountPaise ? BigInt(ev.data.amountPaise) : 0n;
  switch (ev.type) {
    case "payment.succeeded":
    case "transfer.received": {
      const order = await orderByRef(tx, ev.data.orderRef);
      await recordPayment(tx, order, {
        partnerPaymentId: must(ev.data.paymentId),
        amountPaise: amount,
        method: ev.type === "transfer.received" ? "bank_transfer" : undefined,
        eventId: ev.id,
      });
      return;
    }
    case "payment.failed":
    case "payment.timed_out": {
      await tx
        .update(p)
        .set({
          status: ev.type === "payment.failed" ? "Failed" : "Timed out",
          failReason: ev.data.reason ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(p.partnerPaymentId, must(ev.data.paymentId)), eq(p.status, "Pending")));
      return;
    }
    case "refund.processed":
    case "refund.failed": {
      const [refund] = await tx
        .select()
        .from(schema.refunds)
        .where(eq(schema.refunds.partnerRefundId, must(ev.data.refundId)))
        .for("update");
      if (!refund || refund.status !== "Processing") return;
      if (ev.type === "refund.failed") {
        await tx
          .update(schema.refunds)
          .set({ status: "Failed", updatedAt: new Date() })
          .where(eq(schema.refunds.id, refund.id));
        return;
      }
      await tx
        .update(schema.refunds)
        .set({ status: "Refunded", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.refunds.id, refund.id));
      await post(tx, {
        ref: `REF:${refund.reference}:confirmed`,
        sourceEventId: ev.id,
        kind: "refund_confirmed",
        orderId: refund.orderId,
        lines: [
          { account: "refunds_payable", debit: refund.amountPaise },
          { account: "partner_cash", credit: refund.amountPaise },
        ],
      });
      return;
    }
    case "payout.processed":
    case "payout.failed": {
      const [payout] = await tx
        .select()
        .from(schema.payouts)
        .where(eq(schema.payouts.partnerPayoutId, must(ev.data.payoutId)))
        .for("update");
      if (!payout || payout.status !== "Processing") return;
      if (ev.type === "payout.failed") {
        await tx
          .update(schema.payouts)
          .set({ status: "Failed", failReason: ev.data.reason ?? "Failed at the bank", updatedAt: new Date() })
          .where(eq(schema.payouts.id, payout.id));
        return;
      }
      await tx
        .update(schema.payouts)
        .set({ status: "Paid", paidAt: new Date(), utr: ev.data.utr ?? null, updatedAt: new Date() })
        .where(eq(schema.payouts.id, payout.id));
      await post(tx, {
        ref: `PO:${payout.reference}`,
        sourceEventId: ev.id,
        kind: "payout",
        lines: [
          { account: "supplier_payable", organisationId: payout.supplierOrganisationId, debit: payout.amountPaise },
          { account: "partner_cash", credit: payout.amountPaise },
        ],
      });
      // Orders whose every release is now paid out close (807:14435 "Closed").
      const settled = await tx
        .select({ orderId: schema.orderSettlements.orderId })
        .from(schema.orderSettlements)
        .where(eq(schema.orderSettlements.payoutId, payout.id));
      for (const s of settled) {
        const [open] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orderSettlements)
          .leftJoin(schema.payouts, eq(schema.payouts.id, schema.orderSettlements.payoutId))
          .where(
            and(
              eq(schema.orderSettlements.orderId, s.orderId),
              sql`(${schema.payouts.status} is null or ${schema.payouts.status} <> 'Paid')`,
            ),
          );
        const [order] = await tx.select().from(o).where(eq(o.id, s.orderId));
        if (order && (open?.n ?? 0) === 0 && order.status === "Accepted by buyer") {
          await moveOrder(
            tx,
            null,
            order,
            { from: "Accepted by buyer", to: "Closed" },
            {
              reason: `Paid out in ${payout.reference}`,
              also: async (t) => {
                await t.update(o).set({ closedAt: new Date() }).where(eq(o.id, order.id));
              },
            },
          );
        }
      }
      return;
    }
  }
}

/**
 * Records a confirmed payment: allocates it to due milestones in order, posts collected → held (the excess to
 * unallocated for Finance, G9), and moves the order on when what is due is paid.
 */
async function recordPayment(
  tx: Executor,
  order: OrderRow,
  input: { partnerPaymentId: string; amountPaise: bigint; method?: string; eventId: string },
) {
  const [existing] = await tx.select().from(p).where(eq(p.partnerPaymentId, input.partnerPaymentId)).for("update");
  if (existing?.status === "Succeeded") return;
  if (existing) {
    await tx
      .update(p)
      .set({ status: "Succeeded", amountPaise: input.amountPaise, confirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(p.id, existing.id));
  } else {
    await tx.insert(p).values({
      orderId: order.id,
      method: input.method ?? "bank_transfer",
      partner: paymentPartner().name,
      partnerPaymentId: input.partnerPaymentId,
      amountPaise: input.amountPaise,
      status: "Succeeded",
      confirmedAt: new Date(),
    });
  }
  // Allocate to milestones that are due (then upcoming ones, for early payers), oldest first.
  const ms = await tx.select().from(om).where(eq(om.orderId, order.id)).orderBy(asc(om.position)).for("update");
  let left = input.amountPaise;
  for (const m of [...ms.filter((x) => x.status !== "Upcoming"), ...ms.filter((x) => x.status === "Upcoming")]) {
    if (left <= 0n) break;
    const room = m.amountPaise - m.paidPaise;
    if (room <= 0n) continue;
    const take = left < room ? left : room;
    left -= take;
    const paid = m.paidPaise + take;
    await tx
      .update(om)
      .set({
        paidPaise: paid,
        status: paid === m.amountPaise ? "Paid" : m.status === "Upcoming" ? "Upcoming" : "Partly paid",
        paidAt: paid === m.amountPaise ? new Date() : m.paidAt,
      })
      .where(eq(om.id, m.id));
  }
  const kept = input.amountPaise - left;
  await post(tx, {
    ref: `ORD:${order.reference}:payment`,
    sourceEventId: input.eventId,
    kind: "payment",
    orderId: order.id,
    lines: [
      { account: "partner_cash", debit: input.amountPaise },
      { account: "held_for_acceptance", organisationId: order.supplierOrganisationId, credit: kept },
      { account: "unallocated", organisationId: order.buyerOrganisationId, credit: left },
    ],
  });
  if (left > 0n) {
    await audit(tx, {
      actorId: null,
      action: "payment.overpaid",
      resourceType: "order",
      resourceId: order.id,
      companyId: order.buyerOrganisationId,
      after: { overpaidPaise: left.toString() },
      reason: "Overpayment flagged for Finance (G9)",
    });
  }
  // Paid after the buyer accepted: release straight away.
  if (order.status === "Accepted by buyer" || order.status === "Closed") {
    if (kept > 0n) await release(tx, order, kept, `late:${input.eventId}`);
    return;
  }
  if (order.status === "Awaiting payment" && (await paidThrough(tx, order.id, "confirmation"))) {
    await moveOrder(
      tx,
      null,
      order,
      { from: "Awaiting payment", to: "Ready to dispatch" },
      {
        reason: "Payment confirmed by the payment partner",
        also: async (t) => {
          await makeDue(t, order.id, "dispatch");
        },
      },
    );
  }
}

async function after(db: Database, ev: WebhookEvent) {
  if (ev.type === "payment.succeeded" || ev.type === "transfer.received") {
    const [order] = await db
      .select()
      .from(o)
      .where(eq(o.reference, ev.data.orderRef ?? ""));
    if (order) await tell(() => noticePaymentReceived(db, order, BigInt(ev.data.amountPaise ?? "0")));
  }
  if (ev.type === "refund.processed") {
    const [refund] = await db
      .select()
      .from(schema.refunds)
      .where(eq(schema.refunds.partnerRefundId, ev.data.refundId ?? ""));
    if (refund) await tell(() => noticeRefund(db, refund.id));
  }
  if (ev.type === "payout.processed") {
    const [payout] = await db
      .select()
      .from(schema.payouts)
      .where(eq(schema.payouts.partnerPayoutId, ev.data.payoutId ?? ""));
    if (payout) await tell(() => noticePayoutSent(db, payout.id));
  }
}

// ------------------------------------------------------------------------------------------------ release and refund

/**
 * Releases held money to the supplier (acceptance, 10.10): works out the fee, GST on fee, TCS and TDS under the
 * order's rate card version, posts held → supplier payable and the deductions, and books the payout 2 working days
 * later at the next run (11:00 or 16:00 IST).
 */
export async function release(tx: Executor, order: OrderRow, amountPaise: bigint, key: string) {
  if (amountPaise <= 0n) return null;
  const acceptedAt = order.acceptedAt ?? order.createdAt;
  const card = await rateCardVersion(tx, order.rateCardVersion, acceptedAt);
  const [{ feeSoFar } = { feeSoFar: "0" }] = await tx
    .select({ feeSoFar: sql<string>`coalesce(sum(${schema.orderSettlements.feePaise}), 0)::text` })
    .from(schema.orderSettlements)
    .where(eq(schema.orderSettlements.orderId, order.id));
  const categoryId = await tx
    .select({ c: schema.products.categoryId })
    .from(schema.orderLines)
    .innerJoin(schema.products, eq(schema.products.id, schema.orderLines.productId))
    .where(eq(schema.orderLines.orderId, order.id))
    .limit(1);
  const exGst = order.subtotalPaise + order.freightPaise;
  const s = settle({
    card,
    releasedPaise: amountPaise,
    orderTotalPaise: order.totalPaise,
    orderExGstPaise: exGst,
    acceptedAt,
    categoryId: categoryId[0]?.c ?? null,
    supplierId: order.supplierOrganisationId,
    feeSoFarPaise: BigInt(feeSoFar),
  });
  const cal = await calendar(tx);
  const due = cal.add(new Date(), { workingDays: 2 });
  const runAt = nextPayoutRun(due, (d) => cal.isWorkingDay(d));
  const posted = await post(tx, {
    ref: `ORD:${order.reference}:release`,
    sourceEventId: `release:${order.id}:${key}`,
    kind: "release",
    orderId: order.id,
    lines: [
      { account: "held_for_acceptance", organisationId: order.supplierOrganisationId, debit: amountPaise },
      { account: "supplier_payable", organisationId: order.supplierOrganisationId, credit: s.netPaise },
      { account: "platform_fee", credit: s.feePaise },
      { account: "gst_on_fee", credit: s.gstOnFeePaise },
      { account: "tcs_payable", organisationId: order.supplierOrganisationId, credit: s.tcsPaise },
      { account: "tds_payable", organisationId: order.supplierOrganisationId, credit: s.tdsPaise },
    ],
  });
  if (!posted) return null;
  const [row] = await tx
    .insert(schema.orderSettlements)
    .values({
      orderId: order.id,
      supplierOrganisationId: order.supplierOrganisationId,
      releasedPaise: amountPaise,
      orderValueExGstPaise: exGst,
      feePaise: s.feePaise,
      gstOnFeePaise: s.gstOnFeePaise,
      tcsPaise: s.tcsPaise,
      tdsPaise: s.tdsPaise,
      netPaise: s.netPaise,
      rateCardVersion: card.version,
      launchOffer: s.launchOffer,
      payoutDueAt: runAt,
    })
    .returning();
  return must(row);
}

/** Held money on an order (what can be released or refunded). */
export async function heldOn(ex: Executor, orderId: string): Promise<bigint> {
  const [row] = await ex
    .select({
      v: sql<string>`coalesce(sum(${schema.ledgerLines.creditPaise}) - sum(${schema.ledgerLines.debitPaise}), 0)::text`,
    })
    .from(schema.ledgerLines)
    .where(and(eq(schema.ledgerLines.orderId, orderId), eq(schema.ledgerLines.account, "held_for_acceptance")));
  return BigInt(row?.v ?? "0");
}

/**
 * Refunds held money to the buyer (700:8): Processing now, Refunded when the partner confirms. Posts held → refunds
 * payable now and refunds payable → cash on confirmation. Refunds come from the order's confirmed payments.
 */
export async function refund(
  tx: Executor,
  order: OrderRow,
  input: { amountPaise: bigint; reason: string; disputeId?: string | null; requestedBy?: string | null },
) {
  if (input.amountPaise <= 0n) return null;
  const held = await heldOn(tx, order.id);
  if (input.amountPaise > held) throw new OrderError("Only held money can be refunded");
  const [payment] = await tx
    .select()
    .from(p)
    .where(and(eq(p.orderId, order.id), eq(p.status, "Succeeded")))
    .orderBy(asc(p.createdAt))
    .limit(1);
  const reference = await nextReference(tx, "R");
  const partner = paymentPartner();
  const r = await partner.refund(
    { paymentId: payment?.partnerPaymentId ?? order.reference, amountPaise: input.amountPaise, reason: input.reason },
    `refund:${reference}`,
  );
  const [row] = await tx
    .insert(schema.refunds)
    .values({
      reference,
      orderId: order.id,
      disputeId: input.disputeId ?? null,
      paymentId: payment?.id ?? null,
      amountPaise: input.amountPaise,
      reason: input.reason,
      partnerRefundId: r.refundId,
      requestedBy: input.requestedBy ?? null,
    })
    .returning();
  await post(tx, {
    ref: `REF:${reference}:approved`,
    sourceEventId: `refund:${must(row).id}`,
    kind: "refund_approved",
    orderId: order.id,
    lines: [
      { account: "held_for_acceptance", organisationId: order.supplierOrganisationId, debit: input.amountPaise },
      { account: "refunds_payable", organisationId: order.buyerOrganisationId, credit: input.amountPaise },
    ],
  });
  await audit(tx, {
    actorId: input.requestedBy ?? null,
    action: "refund.approved",
    resourceType: "order",
    resourceId: order.id,
    companyId: order.buyerOrganisationId,
    after: { reference, amountPaise: input.amountPaise.toString() },
    reason: input.reason,
  });
  return must(row);
}

// ------------------------------------------------------------------------------------------------ payouts

/**
 * The payout run (11:00 and 16:00 IST): every release due by now, grouped per supplier, paid to the supplier's
 * Active bank account. A supplier with a bank change on hold (8.6) or no Active account waits for the next run.
 */
export async function runPayouts(db: Database, now: Date = new Date()) {
  const s = schema.orderSettlements;
  const due = await db
    .select()
    .from(s)
    .where(and(isNull(s.payoutId), lte(s.payoutDueAt, now)));
  const bySupplier = new Map<string, typeof due>();
  for (const row of due)
    bySupplier.set(row.supplierOrganisationId, [...(bySupplier.get(row.supplierOrganisationId) ?? []), row]);
  const made: string[] = [];
  for (const [supplierId, rows] of bySupplier) {
    const a = schema.payoutBankAccounts;
    const accounts = await db.select().from(a).where(eq(a.organisationId, supplierId));
    const active = accounts.find((x) => x.status === "Active");
    const held = accounts.some((x) => x.status === "Held" && x.holdUntil && x.holdUntil > now);
    if (!active || held) continue;
    const amount = rows.reduce((t, r) => t + r.netPaise, 0n);
    if (amount <= 0n) continue;
    const payoutId = await db.transaction(async (tx) => {
      const reference = await nextReference(tx, "PO", now);
      const [payout] = await tx
        .insert(schema.payouts)
        .values({
          reference,
          supplierOrganisationId: supplierId,
          bankAccountId: active.id,
          amountPaise: amount,
          runAt: now,
        })
        .returning();
      const claimed = await tx
        .update(s)
        .set({ payoutId: must(payout).id })
        .where(
          and(
            inArray(
              s.id,
              rows.map((r) => r.id),
            ),
            isNull(s.payoutId),
          ),
        )
        .returning({ id: s.id });
      if (claimed.length !== rows.length) throw new Error("Another run took these releases");
      return must(payout);
    });
    const res = await paymentPartner().payout(
      { supplierAccountId: active.id, amountPaise: amount, ref: payoutId.reference },
      `payout:${payoutId.id}`,
    );
    await db
      .update(schema.payouts)
      .set({ status: "Processing", partnerPayoutId: res.payoutId, updatedAt: new Date() })
      .where(eq(schema.payouts.id, payoutId.id));
    made.push(payoutId.reference);
  }
  return made;
}

// ------------------------------------------------------------------------------------------------ reconciliation

/**
 * Daily reconciliation (10.4, 10.6): the partner's settlement report against our confirmed payments, refunds and
 * payouts; then each order's ledger against its status and the month's identity. Differences become
 * reconciliation_issues for Finance (705:8).
 */
export async function reconcile(db: Database, day: string) {
  const report = await paymentPartner().settlementReport(day);
  const issues: {
    kind: string;
    partnerRef?: string;
    orderId?: string | null;
    expected?: bigint;
    actual?: bigint;
    detail: string;
  }[] = [];
  for (const line of report) {
    if (line.kind === "payment") {
      const [ours] = await db.select().from(p).where(eq(p.partnerPaymentId, line.partnerRef));
      if (!ours || ours.status !== "Succeeded")
        issues.push({
          kind: "missing_payment",
          partnerRef: line.partnerRef,
          actual: line.amountPaise,
          detail: `The partner settled ${line.partnerRef} for ${line.orderRef ?? "no order"}, but we have no confirmed payment`,
        });
      else if (ours.amountPaise !== line.amountPaise)
        issues.push({
          kind: "amount",
          partnerRef: line.partnerRef,
          orderId: ours.orderId,
          expected: ours.amountPaise,
          actual: line.amountPaise,
          detail: "Amounts differ",
        });
    } else if (line.kind === "refund") {
      const [ours] = await db.select().from(schema.refunds).where(eq(schema.refunds.partnerRefundId, line.partnerRef));
      if (!ours)
        issues.push({
          kind: "missing_refund",
          partnerRef: line.partnerRef,
          actual: line.amountPaise,
          detail: "Refund at the partner we don't know",
        });
    } else {
      const [ours] = await db.select().from(schema.payouts).where(eq(schema.payouts.partnerPayoutId, line.partnerRef));
      if (!ours)
        issues.push({
          kind: "missing_payout",
          partnerRef: line.partnerRef,
          actual: line.amountPaise,
          detail: "Payout at the partner we don't know",
        });
    }
  }
  for (const prob of await orderLedgerProblems(db))
    issues.push({ kind: "order_ledger", orderId: prob.orderId, detail: prob.problem });
  const from = new Date(`${day.slice(0, 7)}-01T00:00:00+05:30`);
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);
  const identity = await monthlyIdentity(db, from, to);
  if (identity.difference !== 0n)
    issues.push({
      kind: "identity",
      expected: 0n,
      actual: identity.difference,
      detail: "The month's identity does not hold",
    });
  for (const i of issues) {
    await db.insert(schema.reconciliationIssues).values({
      day,
      kind: i.kind,
      orderId: i.orderId ?? null,
      partnerRef: i.partnerRef ?? null,
      expectedPaise: i.expected ?? null,
      actualPaise: i.actual ?? null,
      detail: i.detail,
    });
  }
  return { issues: issues.length, identity };
}

/** The simulator's owed webhooks (refunds, payouts settling), delivered through the same pipeline. Worker tick. */
export async function deliverSimWebhooks(db: Database, now: Date = new Date()) {
  if (paymentPartner().name !== "sim") return 0;
  let n = 0;
  for (const w of await simDueWebhooks(db, now)) {
    const result = await receiveWebhook(db, w.raw, w.signature).catch(() => "stored" as const);
    await simMarkDelivered(db, w.id, result !== "stored");
    n++;
  }
  return n;
}

/**
 * When the supplier accepts (10.7): advance and on-confirmation milestones fall due (Awaiting payment, 330:26743). With
 * none, the order is Ready to dispatch and any before-dispatch balance falls due there (339:27238).
 */
export async function openPayments(tx: Executor, order: OrderRow): Promise<"Awaiting payment" | "Ready to dispatch"> {
  const due = await makeDue(tx, order.id, "confirmation");
  if (due > 0) return "Awaiting payment";
  await makeDue(tx, order.id, "dispatch");
  return "Ready to dispatch";
}

export { startClock };
