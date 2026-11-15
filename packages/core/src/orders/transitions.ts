// Order statuses (step 10.1, 807:14435): the exact badge words, and the only moves allowed between them. Every change
// goes through changeStatus() with this table, so history and audit are always written. Pure: safe in the browser.
// "Overdue" is a badge worked out from clocks (dispatch late, payment late, supplier hasn't answered), never stored.

export const ORDER_STATUSES = [
  "Awaiting approval", // internal (G1): the buyer's approver hasn't approved yet
  "Pending acceptance",
  "Accepted",
  "Awaiting payment",
  "Ready to dispatch",
  "Shipped",
  "Delivered",
  "Accepted by buyer",
  "Closed",
  "Declined",
  "Cancelled",
  "Disputed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderTransitions = {
  "Awaiting approval": ["Pending acceptance", "Cancelled"],
  "Pending acceptance": ["Accepted", "Declined", "Cancelled"], // the supplier has 48 hours
  Accepted: ["Awaiting payment", "Ready to dispatch", "Cancelled"],
  "Awaiting payment": ["Ready to dispatch", "Cancelled"],
  "Ready to dispatch": ["Shipped", "Cancelled"], // a "before dispatch" balance shows as a due banner (339:27238)
  Shipped: ["Delivered"],
  Delivered: ["Accepted by buyer", "Disputed"],
  "Accepted by buyer": ["Closed"], // payout released
  Disputed: ["Accepted by buyer", "Cancelled", "Closed"], // per the operator's decision (11.5)
  Declined: [],
  Cancelled: [],
  Closed: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

/** A move the table allows. Any other pair is a type error. */
export type OrderMove = {
  [F in OrderStatus]: { from: F; to: (typeof orderTransitions)[F][number] };
}[OrderStatus];

export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  return (orderTransitions[from] as readonly OrderStatus[]).includes(to);
}

export const FINAL_ORDER_STATUSES: readonly OrderStatus[] = ["Closed", "Declined", "Cancelled"];

/** The seven timeline steps (807:14435). */
export const TIMELINE_STEPS = [
  "Approval",
  "Supplier accepts",
  "Payment",
  "Dispatch",
  "Delivery",
  "Acceptance",
  "Closed",
] as const;
export type TimelineStep = (typeof TIMELINE_STEPS)[number];

/** The step an order is on: 1 to 7. Declined and Cancelled stay on the step where they stopped (`stoppedAt`). */
export function timelineStep(status: OrderStatus, stoppedAt?: OrderStatus): number {
  switch (status) {
    case "Awaiting approval":
      return 1;
    case "Pending acceptance":
      return 2;
    case "Accepted":
    case "Awaiting payment":
      return 3;
    case "Ready to dispatch":
      return 4;
    case "Shipped":
      return 5;
    case "Delivered":
    case "Disputed":
      return 6;
    case "Accepted by buyer":
    case "Closed":
      return 7;
    case "Declined":
      return 2;
    case "Cancelled":
      return stoppedAt ? timelineStep(stoppedAt) : 1;
  }
}

export type BadgeTone = "neutral" | "progress" | "success" | "warning" | "error";

/** The badge tone for each status (807:14435). */
/** Badge tones as drawn on 810:12156 and 807:14435 (Status badge 20:96). */
export const ORDER_BADGE_TONE: Record<OrderStatus | "Overdue", BadgeTone> = {
  "Awaiting approval": "warning",
  "Pending acceptance": "progress",
  Accepted: "progress",
  "Awaiting payment": "warning",
  "Ready to dispatch": "warning",
  Shipped: "progress",
  Delivered: "success",
  "Accepted by buyer": "success",
  Closed: "neutral",
  Declined: "error",
  Cancelled: "error",
  Disputed: "error",
  Overdue: "error",
};

export interface OverdueFacts {
  status: OrderStatus;
  /** When the supplier's 48 hours end (supplierAcceptsOrder clock). */
  acceptBy?: Date | null;
  /** The promised dispatch date. */
  dispatchBy?: Date | null;
  /** The earliest unpaid milestone that is due. */
  paymentDueAt?: Date | null;
}

/**
 * Overdue is derived, never stored (10.1): the supplier hasn't answered in 48 hours, a due payment is late, or
 * dispatch is past its date. Nothing is cancelled or declined automatically (G2, 10.7).
 */
export function isOverdue(o: OverdueFacts, now: Date = new Date()): boolean {
  const late = (d?: Date | null) => !!d && d.getTime() < now.getTime();
  switch (o.status) {
    case "Pending acceptance":
      return late(o.acceptBy);
    case "Awaiting payment":
      return late(o.paymentDueAt);
    case "Accepted":
    case "Ready to dispatch":
      return late(o.dispatchBy);
    default:
      return false;
  }
}

/** The badge shown on lists and the order page: Overdue wins while it applies. */
export function orderBadge(
  o: OverdueFacts,
  now: Date = new Date(),
): { label: OrderStatus | "Overdue"; tone: BadgeTone } {
  const label = isOverdue(o, now) ? "Overdue" : o.status;
  return { label, tone: ORDER_BADGE_TONE[label] };
}

export type BuyerAction =
  "approve" | "wait_supplier" | "pay" | "track" | "accept_or_report" | "view_dispute" | "reorder" | "none";

/** The one main action the buyer sees on each state card (807:14435). */
export function buyerMainAction(status: OrderStatus): BuyerAction {
  switch (status) {
    case "Awaiting approval":
      return "approve";
    case "Pending acceptance":
    case "Accepted":
      return "wait_supplier";
    case "Awaiting payment":
      return "pay";
    case "Ready to dispatch":
    case "Shipped":
      return "track";
    case "Delivered":
      return "accept_or_report";
    case "Disputed":
      return "view_dispute";
    case "Accepted by buyer":
    case "Closed":
      return "reorder";
    case "Declined":
    case "Cancelled":
      return "none";
  }
}

/** Tabs on My orders (77:673) and the supplier pipeline (810:12156). */
export const BUYER_ORDER_TABS = [
  { key: "all", label: "All", statuses: ORDER_STATUSES },
  { key: "approval", label: "Awaiting approval", statuses: ["Awaiting approval"] },
  {
    key: "active",
    label: "In progress",
    statuses: ["Pending acceptance", "Accepted", "Awaiting payment", "Ready to dispatch", "Shipped"],
  },
  { key: "delivered", label: "Delivered", statuses: ["Delivered", "Disputed"] },
  { key: "done", label: "Completed", statuses: ["Accepted by buyer", "Closed", "Declined", "Cancelled"] },
] as const satisfies readonly { key: string; label: string; statuses: readonly OrderStatus[] }[];

/** The supplier pipeline tiles (810:12156): open stages, then Paid out (closed this month). */
export const SUPPLIER_PIPELINE = [
  { key: "pending", label: "Pending acceptance", statuses: ["Pending acceptance"] },
  { key: "accepted", label: "Accepted", statuses: ["Accepted"] },
  { key: "payment", label: "Awaiting payment", statuses: ["Awaiting payment"] },
  { key: "dispatch", label: "Ready to dispatch", statuses: ["Ready to dispatch"] },
  { key: "shipped", label: "Shipped", statuses: ["Shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["Delivered", "Disputed", "Accepted by buyer"] },
  { key: "paid", label: "Paid out", statuses: ["Closed"] },
] as const satisfies readonly { key: string; label: string; statuses: readonly OrderStatus[] }[];
