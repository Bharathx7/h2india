import { schema, type Database, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { Money } from "../money";
import { notify } from "../notify/notify";
import type { TopicName } from "../notify/topics";
import { peopleWith, type OrderRow } from "./records";

// Order notices (Stage 10). In-app for everyone whose role covers the order; the email and WhatsApp templates drawn on
// page 16 (Order confirmed pay now 665:82, Payment instructions 665:151, Payment received 671:620, Order dispatched
// 671:685, Acceptance reminder 671:756, Dispute opened 673:8, Approval needed 673:86, Payout sent 665:239) are added to
// each notice as their renderers are built from the frames. Callers send notices only after the change is saved.

type Side = "buyer" | "supplier";

async function tellSide(
  db: Executor,
  order: Pick<OrderRow, "id" | "buyerOrganisationId" | "supplierOrganisationId">,
  side: Side,
  n: { event: string; topic: TopicName; title: string; body?: string; icon?: string; permission?: string },
) {
  const org = side === "buyer" ? order.buyerOrganisationId : order.supplierOrganisationId;
  const people = await peopleWith(db, org, n.permission ?? "order.view", side);
  const href = side === "buyer" ? `/buyer/orders/${order.id}` : `/supplier/orders/${order.id}`;
  for (const person of people) {
    await notify({
      event: n.event,
      topic: n.topic,
      userId: person.id,
      scope: org,
      inApp: { category: "orders", icon: n.icon ?? "package", title: n.title, body: n.body, href },
    });
  }
}

export async function noticeOrderPlaced(db: Executor, order: OrderRow) {
  if (order.status === "Awaiting approval") return;
  await tellSide(db, order, "supplier", {
    event: "order.placed",
    topic: "order.status_changed",
    title: `New order ${order.reference}: accept or decline within 48 hours`,
    permission: "order.manage",
  });
}

export async function noticeApprovalNeeded(db: Executor, order: OrderRow, approverIds: string[]) {
  for (const id of approverIds) {
    await notify({
      event: "order.approval_needed",
      topic: "order.approval_needed",
      userId: id,
      scope: order.buyerOrganisationId,
      inApp: {
        category: "orders",
        icon: "shield-check",
        title: `${order.reference} needs your approval · ${Money.format(order.totalPaise)}`,
        href: `/buyer/orders/${order.id}/approve`,
        actionLabel: "Review",
      },
    });
  }
}

export async function noticeStatus(db: Executor, order: OrderRow, side: Side, title: string, icon?: string) {
  await tellSide(db, order, side, { event: "order.status", topic: "order.status_changed", title, icon });
}

export async function noticePaymentDue(db: Executor, order: OrderRow, amountPaise: bigint) {
  await tellSide(db, order, "buyer", {
    event: "payment.due",
    topic: "payment.due",
    title: `${order.reference}: ${Money.format(amountPaise)} is due`,
    icon: "credit-card",
    permission: "order.place",
  });
}

export async function noticePaymentReceived(db: Database, order: OrderRow, amountPaise: bigint) {
  await tellSide(db, order, "buyer", {
    event: "payment.received",
    topic: "order.status_changed",
    title: `${order.reference}: payment of ${Money.format(amountPaise)} received`,
    icon: "check-circle",
  });
  await tellSide(db, order, "supplier", {
    event: "payment.received",
    topic: "order.status_changed",
    title: `${order.reference}: the buyer paid ${Money.format(amountPaise)}. It's held until they accept the delivery`,
    icon: "check-circle",
  });
}

export async function noticeRefund(db: Database, refundId: string) {
  const [r] = await db.select().from(schema.refunds).where(eq(schema.refunds.id, refundId));
  if (!r) return;
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, r.orderId));
  if (!order) return;
  await tellSide(db, order, "buyer", {
    event: "refund.status",
    topic: "order.status_changed",
    title: `${r.reference}: ${Money.format(r.amountPaise)} ${r.status === "Refunded" ? "refunded" : "refund is processing"}`,
    icon: "rotate-ccw",
  });
}

export async function noticePayoutSent(db: Database, payoutId: string) {
  const [po] = await db.select().from(schema.payouts).where(eq(schema.payouts.id, payoutId));
  if (!po) return;
  const people = await peopleWith(db, po.supplierOrganisationId, "money.view", "supplier");
  for (const person of people) {
    await notify({
      event: "payout.sent",
      topic: "invoice.ready",
      userId: person.id,
      scope: po.supplierOrganisationId,
      inApp: {
        category: "orders",
        icon: "banknote",
        title: `Payout ${po.reference}: ${Money.format(po.amountPaise)} sent${po.utr ? ` (UTR ${po.utr})` : ""}`,
        href: `/supplier/invoices/payouts/${po.id}`,
      },
    });
  }
}
