import { parseServerEnv } from "@h2india/config";
import { schema, type Database, type Executor } from "@h2india/db";
import {
  approvalNeededMessage,
  disputeOpenedMessage,
  orderConfirmedMessage,
  orderDispatchedMessage,
  paymentReceivedMessage,
  payoutSentMessage,
  renderOrderEmail,
  type TemplateId,
} from "@h2india/emails";
import { eq } from "drizzle-orm";
import { Money } from "../money";
import { notify } from "../notify/notify";
import type { TopicName } from "../notify/topics";
import { peopleWith, type OrderRow } from "./records";

// Order notices (Stage 10). In-app for everyone whose role covers the order, and email for the moments page 16 draws
// (Order confirmed pay now 665:82, Payment received 671:620, Order dispatched 671:685, Dispute opened 673:8, Approval
// needed 673:86, Payout sent 665:239), in the notice layout (A178). Callers send notices only after the change is saved.

const appUrl = () => parseServerEnv().APP_URL.replace(/\/$/, "");
type Mail = (person: {
  name: string;
}) => ReturnType<typeof orderConfirmedMessage> | ReturnType<typeof payoutSentMessage>;

type Side = "buyer" | "supplier";

async function tellSide(
  db: Executor,
  order: Pick<OrderRow, "id" | "buyerOrganisationId" | "supplierOrganisationId">,
  side: Side,
  n: {
    event: string;
    topic: TopicName;
    title: string;
    body?: string;
    icon?: string;
    permission?: string;
    email?: { template: TemplateId; message: Mail };
  },
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
      email: n.email
        ? { template: n.email.template, mail: await renderOrderEmail(appUrl(), n.email.message(person)) }
        : undefined,
    });
  }
}

const first = (name: string) => name.split(/\s+/)[0] ?? name;
const orderUrl = (order: { id: string }, side: Side) =>
  `${appUrl()}/${side === "buyer" ? "buyer" : "supplier"}/orders/${order.id}`;

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
  const [requester] = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, order.placedBy));
  const [supplier] = await db
    .select({ name: schema.organisations.legalName })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, order.supplierOrganisationId));
  for (const id of approverIds) {
    const [person] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, id));
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
      email: {
        template: "email.approval_needed",
        mail: await renderOrderEmail(
          appUrl(),
          approvalNeededMessage({
            name: first(person?.name ?? ""),
            reference: order.reference,
            orderUrl: `${appUrl()}/buyer/orders/${order.id}/approve`,
            requester: requester?.name ?? "A colleague",
            amount: Money.format(order.totalPaise),
            supplier: supplier?.name ?? "the supplier",
          }),
        ),
      },
    });
  }
}

/** Order confirmed, pay now (665:82): to the buyer when the supplier accepts. */
export async function noticeOrderConfirmed(
  db: Executor,
  order: OrderRow,
  supplier: string,
  amount: bigint,
  due: string | null,
) {
  await tellSide(db, order, "buyer", {
    event: "order.confirmed",
    topic: "payment.due",
    title: amount > 0n ? `${order.reference} confirmed: pay ${Money.format(amount)}` : `${order.reference} confirmed`,
    icon: "check-circle",
    email:
      amount > 0n
        ? {
            template: "email.order_confirmed_pay_now",
            message: (p) =>
              orderConfirmedMessage({
                name: first(p.name),
                reference: order.reference,
                orderUrl: orderUrl(order, "buyer"),
                supplier,
                amount: Money.format(amount),
                due,
              }),
          }
        : undefined,
  });
}

/** Order dispatched (671:685): to the buyer. */
export async function noticeDispatched(
  db: Executor,
  order: OrderRow,
  d: { supplier: string; carrier: string; lr: string; expected: string },
) {
  await tellSide(db, order, "buyer", {
    event: "order.dispatched",
    topic: "order.status_changed",
    title: `${order.reference} has been dispatched`,
    icon: "truck",
    email: {
      template: "email.order_dispatched",
      message: (p) =>
        orderDispatchedMessage({
          name: first(p.name),
          reference: order.reference,
          orderUrl: orderUrl(order, "buyer"),
          ...d,
        }),
    },
  });
}

/** Dispute opened (673:8): to the supplier. */
export async function noticeDisputeOpened(
  db: Executor,
  order: OrderRow,
  d: { buyer: string; dispute: string; held: bigint; replyBy: string },
) {
  await tellSide(db, order, "supplier", {
    event: "dispute.opened",
    topic: "order.status_changed",
    title: `${d.dispute}: the buyer reported a problem with ${order.reference}`,
    icon: "alert-triangle",
    permission: "order.manage",
    email: {
      template: "email.dispute_opened",
      message: (p) =>
        disputeOpenedMessage({
          name: first(p.name),
          reference: order.reference,
          orderUrl: orderUrl(order, "supplier"),
          buyer: d.buyer,
          dispute: d.dispute,
          held: Money.format(d.held),
          replyBy: d.replyBy,
        }),
    },
  });
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
  const [supplier] = await db
    .select({ name: schema.organisations.legalName })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, order.supplierOrganisationId));
  await tellSide(db, order, "buyer", {
    event: "payment.received",
    topic: "order.status_changed",
    title: `${order.reference}: payment of ${Money.format(amountPaise)} received`,
    icon: "check-circle",
    email: {
      template: "email.payment_received",
      message: (p) =>
        paymentReceivedMessage({
          name: first(p.name),
          reference: order.reference,
          orderUrl: orderUrl(order, "buyer"),
          amount: Money.format(amountPaise),
          supplier: supplier?.name ?? "the supplier",
        }),
    },
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
      email: {
        template: "email.payout_sent",
        mail: await renderOrderEmail(
          appUrl(),
          payoutSentMessage({
            name: first(person.name),
            payout: po.reference,
            amount: Money.format(po.amountPaise),
            utr: po.utr,
            url: `${appUrl()}/supplier/invoices/payouts/${po.id}`,
          }),
        ),
      },
    });
  }
}
