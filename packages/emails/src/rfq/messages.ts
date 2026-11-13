import type { NoticeProps } from "../notice";

// RFQ emails (step 9.4): RFQ received (671:482) to each chosen supplier, and RFQ returned (671:554) to the buyer with
// its approved variant ("Your RFQ is live"). Words as drawn. The buyer's name is never in the supplier's email: only
// the kind of buyer (contact details are shared only with suppliers who quote).

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const article = (w: string) => (/^[aeiou]/i.test(w) ? "An" : "A");

export interface RfqReceived {
  name: string;
  supplier: string;
  reference: string;
  item: string;
  category: string;
  quantity: string;
  /** "research institute", "project developer", or "buyer" */
  buyerType: string;
  /** Delivery state */
  deliverTo: string;
  /** "24 Nov 2026" */
  due: string;
  quoteUrl: string;
  declineUrl: string;
  preferencesUrl: string;
}

export function rfqReceivedMessage(d: RfqReceived): Message {
  const who = `${article(d.buyerType)} ${d.buyerType}`;
  return {
    subject: `New ${d.reference}: ${d.item.charAt(0).toLowerCase()}${d.item.slice(1)}, quote by ${d.due.replace(/ \d{4}$/, "")}`,
    preview: `${who}${d.deliverTo ? ` in ${d.deliverTo}` : ""} wants ${d.quantity}.`,
    reason: `You're getting this because ${d.supplier} lists products in this category.`,
    eyebrow: `${d.reference} · New`,
    headline: `${who} wants a quote`,
    paragraphs: [
      `Hi ${first(d.name)}, this RFQ matches what ${d.supplier} sells. Send your quote before the deadline to be considered.`,
    ],
    rows: [
      { label: "Item", value: d.item },
      { label: "Category", value: d.category },
      { label: "Quantity", value: d.quantity },
      { label: "Buyer", value: d.buyerType.charAt(0).toUpperCase() + d.buyerType.slice(1) },
      { label: "Deliver to", value: d.deliverTo },
      { label: "Send your quote by", value: d.due },
    ].filter((r) => r.value),
    button: { label: "View and quote", href: d.quoteUrl },
    links: [
      { label: "Not a fit? Decline this RFQ", href: d.declineUrl },
      { label: "Email preferences", href: d.preferencesUrl },
    ],
  };
}

export interface RfqReturned {
  name: string;
  reference: string;
  /** "Electrolysers × 10" */
  summary: string;
  whatToAdd: string;
  note: string;
  editUrl: string;
  viewUrl: string;
}

export function rfqReturnedMessage(d: RfqReturned): Message {
  return {
    subject: "Your RFQ needs a few details",
    preview: d.whatToAdd
      ? `Add ${d.whatToAdd.charAt(0).toLowerCase()}${d.whatToAdd.slice(1)} so suppliers can quote.`
      : "Add a few details so suppliers can quote.",
    reason: `You're getting this because you submitted ${d.reference}.`,
    eyebrow: `${d.reference} · Changes needed`,
    headline: "Your RFQ needs a few details",
    paragraphs: [`Hi ${first(d.name)}, before we send ${d.reference} to suppliers, please add a few details.`],
    rows: [
      { label: "RFQ", value: `${d.reference} · ${d.summary}` },
      { label: "Status", value: "Changes needed" },
      { label: "What to add", value: d.whatToAdd },
      { label: "Reviewer's note", value: d.note },
    ].filter((r) => r.value),
    note: "Your RFQ isn't sent to suppliers until it's approved.",
    button: { label: "Edit and resubmit", href: d.editUrl },
    links: [{ label: "View your RFQ", href: d.viewUrl }],
  };
}

export function rfqApprovedMessage(d: {
  name: string;
  reference: string;
  summary: string;
  suppliers: number;
  viewUrl: string;
}): Message {
  return {
    subject: "Your RFQ is live",
    preview: `${d.reference} went to ${String(d.suppliers)} ${d.suppliers === 1 ? "supplier" : "suppliers"}.`,
    reason: `You're getting this because you submitted ${d.reference}.`,
    eyebrow: `${d.reference} · Approved`,
    headline: "Your RFQ is live",
    paragraphs: [
      `Hi ${first(d.name)}, we checked ${d.reference} and sent it to the ${String(d.suppliers)} ${d.suppliers === 1 ? "supplier" : "suppliers"} you chose. We'll tell you when quotes arrive.`,
    ],
    rows: [
      { label: "RFQ", value: `${d.reference} · ${d.summary}` },
      { label: "Status", value: "Approved" },
      { label: "Sent to", value: `${String(d.suppliers)} ${d.suppliers === 1 ? "supplier" : "suppliers"}` },
    ],
    button: { label: "View your RFQ", href: d.viewUrl },
  };
}
