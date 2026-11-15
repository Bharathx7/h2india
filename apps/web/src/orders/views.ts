import { Money } from "@h2india/core/money";
import type { OrderListItem } from "@h2india/core/orders";
import { formatIstDayMonth } from "@h2india/core/time";

// Order wording that is pure (step 10.7): the "Next step" column of the supplier pipeline (810:12156) and its phone
// cards (811:12343). Unit-tested in views.test.ts.

const HOUR = 3_600_000;

/** "Advance", "Balance": what the milestone is called on 810:12156 ("Advance ₹32,47,800 due 13 Nov"). */
export function milestoneWord(trigger: string): string {
  switch (trigger) {
    case "Advance":
    case "On confirmation":
      return "Advance";
    case "Before dispatch":
      return "Balance";
    case "On receipt":
      return "Payment on receipt";
    case "Retention":
      return "Retention";
    default:
      return "Payment";
  }
}

export interface NextStep {
  text: string;
  /** Error when the supplier is late. */
  urgent: boolean;
}

export function supplierNextStep(o: OrderListItem, now: Date = new Date()): NextStep {
  const hours = (d: Date) => Math.max(1, Math.round(Math.abs(d.getTime() - now.getTime()) / HOUR));
  switch (o.status) {
    case "Pending acceptance":
      if (o.acceptBy && o.acceptBy.getTime() < now.getTime())
        return { text: `Overdue by ${String(hours(o.acceptBy))} h · accept or decline`, urgent: true };
      return { text: o.acceptBy ? `Accept within ${String(hours(o.acceptBy))} h` : "Accept or decline", urgent: false };
    case "Accepted":
    case "Awaiting payment":
    case "Ready to dispatch":
      if (o.due)
        return {
          text: `${milestoneWord(o.due.label)} ${Money.format(o.due.amountPaise)}${o.due.dueAt ? ` due ${formatIstDayMonth(o.due.dueAt)}` : " due"}`,
          urgent: false,
        };
      return {
        text: o.dispatchBy ? `Ship by ${formatIstDayMonth(o.dispatchBy)}` : "Ready to ship",
        urgent: o.overdue,
      };
    case "Shipped":
      return {
        text: [o.shippedAt ? `Shipped ${formatIstDayMonth(o.shippedAt)}` : "Shipped", o.transporter]
          .filter(Boolean)
          .join(" · "),
        urgent: false,
      };
    case "Delivered":
      return {
        text: o.buyerAcceptBy ? `Buyer accepts by ${formatIstDayMonth(o.buyerAcceptBy)}` : "Waiting for the buyer",
        urgent: false,
      };
    case "Disputed":
      return { text: "Problem reported · reply within 2 working days", urgent: true };
    case "Accepted by buyer":
      return { text: "Payout in the next run", urgent: false };
    case "Closed":
      return { text: o.closedAt ? `Paid out ${formatIstDayMonth(o.closedAt)}` : "Paid out", urgent: false };
    case "Awaiting approval":
    case "Declined":
    case "Cancelled":
      return { text: "", urgent: false };
  }
}

/** Badge for a pipeline row: an overdue supplier answer turns Pending acceptance red (810:12156). */
export function pipelineBadge(o: OrderListItem) {
  return { label: o.status, tone: o.overdue ? ("error" as const) : o.badge.tone };
}
