// Order emails (Stage 10; page 16 frames 665:82, 665:151, 671:620, 671:685, 671:756, 673:8, 673:86, 665:239). Built in the
// notice layout from the frames' subjects and the screens' words while Figma is out of reach (A178); each is listed in
// docs/approvals/frames-to-check.md. Amounts arrive formatted (₹48,79,400); escrow wording is OPEN (M3).

interface Base {
  name: string;
  reference: string;
  orderUrl: string;
}

const reason = "You get this because you're on an order on H2 India.";

export function orderConfirmedMessage(d: Base & { supplier: string; amount: string; due: string | null }) {
  return {
    subject: `${d.reference} confirmed: pay ${d.amount}${d.due ? ` by ${d.due}` : ""}`,
    preview: `${d.supplier} confirmed your order. Pay ${d.amount} into its escrow account.`,
    reason,
    eyebrow: "ORDER CONFIRMED",
    headline: `${d.supplier} confirmed ${d.reference}`,
    paragraphs: [
      `Hi ${d.name}, the next step is your payment of ${d.amount}${d.due ? `, due by ${d.due}` : ""}. It goes into the order's own escrow account and is held until you accept the delivery.`,
      "Pay online, or by bank transfer into the account shown on the order. Never pay into a supplier's own account.",
    ],
    button: { label: "Pay now", href: d.orderUrl },
  };
}

export function paymentReceivedMessage(d: Base & { amount: string; supplier: string }) {
  return {
    subject: `Payment of ${d.amount} received for ${d.reference}`,
    preview: `We've received ${d.amount}. It's held until you accept the delivery.`,
    reason,
    eyebrow: "PAYMENT RECEIVED",
    headline: `${d.amount} received`,
    paragraphs: [
      `Hi ${d.name}, our payment partner confirmed your payment for ${d.reference}. It's held in escrow until you accept the delivery from ${d.supplier}.`,
    ],
    button: { label: "View order", href: d.orderUrl },
  };
}

export function orderDispatchedMessage(d: Base & { supplier: string; carrier: string; lr: string; expected: string }) {
  return {
    subject: `${d.reference} is on its way`,
    preview: `${d.supplier} dispatched your order with ${d.carrier}. Expected ${d.expected}.`,
    reason,
    eyebrow: "ORDER DISPATCHED",
    headline: `${d.reference} is on its way`,
    paragraphs: [
      `Hi ${d.name}, ${d.supplier} dispatched your order. Your receiving contact gets a delivery code by SMS when it arrives.`,
    ],
    rows: [
      { label: "Carrier", value: d.carrier },
      { label: "LR number", value: d.lr },
      { label: "Expected", value: d.expected },
    ],
    button: { label: "Track order", href: d.orderUrl },
  };
}

export function acceptanceReminderMessage(d: Base & { supplier: string; by: string }) {
  return {
    subject: `Accept ${d.reference} or report a problem by ${d.by}`,
    preview: `Your delivery from ${d.supplier} is waiting for your acceptance.`,
    reason,
    eyebrow: "DELIVERED",
    headline: "Is everything as ordered?",
    paragraphs: [
      `Hi ${d.name}, ${d.reference} from ${d.supplier} was delivered. Accept it to release the payment, or report a problem and it stays on hold.`,
    ],
    button: { label: "Accept or report", href: d.orderUrl },
  };
}

export function disputeOpenedMessage(d: Base & { buyer: string; dispute: string; held: string; replyBy: string }) {
  return {
    subject: `${d.buyer} reported a problem with ${d.reference}`,
    preview: `Reply by ${d.replyBy}. ${d.held} is held until it's resolved.`,
    reason,
    eyebrow: "PROBLEM REPORTED",
    headline: `${d.buyer} reported a problem`,
    paragraphs: [
      `Hi ${d.name}, ${d.dispute} is open on ${d.reference}. ${d.held} is held in escrow until you both agree or H2 India decides.`,
      `Reply by ${d.replyBy} with an offer or your side of it.`,
    ],
    button: { label: "Respond", href: d.orderUrl },
  };
}

export function approvalNeededMessage(d: Base & { requester: string; amount: string; supplier: string }) {
  return {
    subject: `${d.reference} needs your approval · ${d.amount}`,
    preview: `${d.requester} placed an order with ${d.supplier} above the approval limit.`,
    reason: "You get this because you approve orders for your company on H2 India.",
    eyebrow: "APPROVAL NEEDED",
    headline: `${d.requester} needs your approval`,
    paragraphs: [
      `Hi ${d.name}, ${d.reference} for ${d.amount} with ${d.supplier} is above your company's approval limit. It goes to the supplier only after you approve it with your passkey.`,
    ],
    button: { label: "Review order", href: d.orderUrl },
  };
}

export function payoutSentMessage(d: {
  name: string;
  payout: string;
  amount: string;
  utr: string | null;
  url: string;
}) {
  return {
    subject: `Payout ${d.payout}: ${d.amount} sent`,
    preview: `${d.amount} is on its way to your payout account.`,
    reason: "You get this because you see payouts for your company on H2 India.",
    eyebrow: "PAYOUT SENT",
    headline: `${d.amount} sent`,
    paragraphs: [`Hi ${d.name}, payout ${d.payout} has been sent to your payout bank account.`],
    rows: d.utr ? [{ label: "UTR", value: d.utr }] : undefined,
    button: { label: "View payout", href: d.url },
  };
}
