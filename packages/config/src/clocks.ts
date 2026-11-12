// Clocks and service levels (step 3.8, decision A24): the values drawn on System settings (707:793) and in playbook
// Section 5. Super admins change them later in System settings (step 11.8); a change applies to new deadlines only,
// because each deadline stores its own due time. Safe to import anywhere.

export type Duration = { hours: number } | { workingDays: number } | { days: number };

export interface ClockRule {
  label: string;
  duration: Duration;
  /** Read from. */
  source: string;
}

export const CLOCKS = {
  rfqModeration: { label: "RFQ moderation", duration: { workingDays: 1 }, source: "RFQ wizard 398:9635" },
  supplierReview: { label: "Supplier review", duration: { workingDays: 2 }, source: "System settings 707:793" },
  queueAmber: { label: "Queue item turns amber", duration: { hours: 24 }, source: "System settings 707:793" },
  queueRed: { label: "Queue item turns red", duration: { hours: 48 }, source: "System settings 707:793" },
  supplierAcceptsOrder: {
    label: "Supplier accepts an order",
    duration: { hours: 48 },
    source: "System settings 707:793",
  },
  buyerAcceptsDelivery: {
    label: "Buyer accepts a delivery",
    duration: { workingDays: 5 },
    source: "System settings 707:793",
  },
  disputeSupplierReply: {
    label: "Supplier replies to a dispute",
    duration: { workingDays: 2 },
    source: "System settings 707:793",
  },
  disputeReview: {
    label: "H2 India reviews a dispute",
    duration: { workingDays: 5 },
    source: "System settings 707:793",
  },
  grievanceAcknowledge: {
    label: "Acknowledge a grievance",
    duration: { hours: 24 },
    source: "System settings 707:793",
  },
  grievanceResolve: { label: "Resolve a grievance", duration: { days: 15 }, source: "System settings 707:793" },
  payoutDelay: {
    label: "Payout after the buyer accepts",
    duration: { workingDays: 2 },
    source: "How fees work 272:4636",
  },
  bankChangeHold: { label: "Payouts held after a bank change", duration: { hours: 72 }, source: "588:1179 (C5)" },
  dataRightsDue: { label: "Data-rights request due", duration: { days: 30 }, source: "Compliance 660:1786" },
} as const satisfies Record<string, ClockRule>;

export type ClockName = keyof typeof CLOCKS;

/** Payout runs, IST (Payments 704:9). */
export const PAYOUT_RUNS_IST = ["11:00", "16:00"] as const;

/** Working days (M18): Monday to Saturday. Sunday is 0. */
export const WORKING_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6];

export function describeDuration(d: Duration): string {
  if ("hours" in d) return `${String(d.hours)} hours`;
  if ("workingDays" in d) return `${String(d.workingDays)} working ${d.workingDays === 1 ? "day" : "days"}`;
  return `${String(d.days)} days`;
}
