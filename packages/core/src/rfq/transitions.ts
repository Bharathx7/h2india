// RFQ and quote statuses (step 9.2): the exact badge words, and the only moves allowed between them. Every change goes
// through changeStatus() with one of these tables, so history and audit are always written. Pure: safe in the browser.

export const RFQ_STATUSES = ["Draft", "In moderation", "Returned", "Sent", "Quotes received", "Closed"] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

export const rfqTransitions = {
  Draft: ["In moderation", "Sent"], // Sent directly only when one supplier is chosen
  "In moderation": ["Sent", "Returned", "Closed"], // Closed: rejected by moderation (632:1138)
  Returned: ["Draft"], // the buyer edits, then submits again
  Sent: ["Quotes received", "Closed"],
  "Quotes received": ["Closed"], // closed by accepting, declining all, or Close RFQ
  Closed: [],
} as const satisfies Record<RfqStatus, readonly RfqStatus[]>;

export const QUOTE_STATUSES = ["Draft", "Sent", "Revised", "Withdrawn", "Expired", "Not selected", "Accepted"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const quoteTransitions = {
  Draft: ["Sent"],
  Sent: ["Revised", "Withdrawn", "Expired", "Not selected", "Accepted"],
  Revised: ["Revised", "Withdrawn", "Expired", "Not selected", "Accepted"],
  Expired: ["Revised", "Not selected"], // "Send a new quote" (619:8) sends the next version
  Withdrawn: [],
  "Not selected": [],
  Accepted: [],
} as const satisfies Record<QuoteStatus, readonly QuoteStatus[]>;

export const RECIPIENT_STATUSES = ["Sent", "Viewed", "Quoted", "Declined", "Expired"] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

/** A move from one status to another that the table allows. Any other pair is a type error. */
export type RfqMove = {
  [F in RfqStatus]: { from: F; to: (typeof rfqTransitions)[F][number] };
}[RfqStatus];
export type QuoteMove = {
  [F in QuoteStatus]: { from: F; to: (typeof quoteTransitions)[F][number] };
}[QuoteStatus];

export function canMoveRfq(from: RfqStatus, to: RfqStatus): boolean {
  return (rfqTransitions[from] as readonly RfqStatus[]).includes(to);
}
export function canMoveQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  return (quoteTransitions[from] as readonly QuoteStatus[]).includes(to);
}

/** A quote the buyer can still accept: sent, not withdrawn or expired, and valid today. */
export function acceptable(status: QuoteStatus, validUntil: Date | null, now: Date = new Date()): boolean {
  return (status === "Sent" || status === "Revised") && (validUntil === null || validUntil.getTime() > now.getTime());
}

/** The most suppliers one RFQ can go to (wizard step 2, 398:9635). */
export const MAX_RFQ_SUPPLIERS = 5;

/** An RFQ to more than one supplier is checked by H2 India first (note on 557:8). */
export const needsModeration = (supplierCount: number) => supplierCount > 1;

export interface RfqBadge {
  label: string;
  tone: "neutral" | "progress" | "success" | "warning" | "error";
}

/**
 * The badge on the buyer's list (557:8): Sent (n), Quotes received x/n, Expiring near the offer deadline; Returned
 * shows as returned by moderation. `expiringMs` is the rfqExpiring clock.
 */
export function rfqBadge(
  r: { status: RfqStatus; offerDeadline: Date | null; suppliers: number; quoted: number },
  expiringMs: number,
  now: Date = new Date(),
): RfqBadge {
  const open = r.status === "Sent" || r.status === "Quotes received";
  if (open && r.offerDeadline && r.offerDeadline.getTime() - now.getTime() <= expiringMs) {
    return { label: "Expiring", tone: "warning" };
  }
  switch (r.status) {
    case "Draft":
      return { label: "Draft", tone: "neutral" };
    case "In moderation":
      return { label: "In moderation", tone: "progress" };
    case "Returned":
      return { label: "Returned by moderation", tone: "warning" };
    case "Sent":
      return { label: `Sent (${String(r.suppliers)})`, tone: "success" };
    case "Quotes received":
      return { label: `Quotes received ${String(r.quoted)}/${String(r.suppliers)}`, tone: "success" };
    case "Closed":
      return { label: "Closed", tone: "neutral" };
  }
}

/** The buyer's tabs (557:8) and which statuses each holds. */
export const RFQ_TABS = [
  { key: "drafts", label: "Drafts", statuses: ["Draft", "Returned"] },
  { key: "moderation", label: "In moderation", statuses: ["In moderation"] },
  { key: "open", label: "Open", statuses: ["Sent"] },
  { key: "quotes", label: "Quotes received", statuses: ["Quotes received"] },
  { key: "closed", label: "Closed", statuses: ["Closed"] },
] as const satisfies readonly { key: string; label: string; statuses: readonly RfqStatus[] }[];
