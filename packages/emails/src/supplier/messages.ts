import type { NoticeProps } from "../notice";

// Verification status (673:221) and the variants it lists: "You're verified" with what we checked, and "Your
// verification needs changes" with each reason and where to fix it. Words as drawn.

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export interface ExpiringDocument {
  name: string;
  company: string;
  /** "Hydrotek Systems Private Limited · verified since 14 Mar 2026" */
  companyLine: string;
  /** "ISO 22734 certificate" */
  document: string;
  /** "PEM electrolysers" */
  scope?: string;
  /** "23 Nov 2026" */
  expires: string;
  days: number;
  /** "All valid. Next to expire: PESO licence, 30 Jun 2027" */
  others: string;
  uploadUrl: string;
  statusUrl: string;
}

export function documentExpiringMessage(d: ExpiringDocument): Message {
  return {
    subject: `Your ${d.document} expires on ${d.expires.replace(/ \d{4}$/, "")}`,
    preview: "Upload the renewed certificate so buyers keep seeing it.",
    reason: `You're getting this because you're an admin of ${d.company}.`,
    eyebrow: "Verification · document expiring",
    headline: `Your ${d.document} expires in ${String(d.days)} ${d.days === 1 ? "day" : "days"}`,
    paragraphs: [
      `Hi ${first(d.name)}, the ${d.document}${d.scope ? ` for your ${d.scope}` : ""} expires on ${d.expires}. Upload the renewed one so buyers keep seeing it.`,
    ],
    rows: [
      { label: "Company", value: d.companyLine },
      { label: "Document", value: [d.document, d.scope].filter(Boolean).join(" · ") },
      { label: "Expires", value: d.expires },
      { label: "Your other documents", value: d.others },
    ],
    note: "If it lapses, buyers see it marked as expired until you upload the renewed certificate.",
    button: { label: "Upload renewed certificate", href: d.uploadUrl },
    links: [{ label: "View verification status", href: d.statusUrl }],
  };
}

export function verifiedMessage(d: { name: string; company: string; checked: string[]; statusUrl: string }): Message {
  return {
    subject: `You're verified: ${d.company}`,
    preview: "Buyers now see the Verified supplier badge on your profile, products and quotes.",
    reason: `You're getting this because you're an admin of ${d.company}.`,
    eyebrow: "Verification · verified",
    headline: "You're verified",
    paragraphs: [
      `Hi ${first(d.name)}, H2 India has checked ${d.company}. Buyers now see the Verified supplier badge, with today's date.`,
    ],
    rows: d.checked.map((c) => ({ label: "Checked", value: c })),
    button: { label: "View verification status", href: d.statusUrl },
  };
}

export function needsChangesMessage(d: {
  name: string;
  company: string;
  reasons: { item: string; reason: string }[];
  statusUrl: string;
}): Message {
  return {
    subject: `Your verification needs changes: ${d.company}`,
    preview: d.reasons[0]?.reason ?? "See what to fix.",
    reason: `You're getting this because you're an admin of ${d.company}.`,
    eyebrow: "Verification · needs changes",
    headline: "Your verification needs changes",
    paragraphs: [`Hi ${first(d.name)}, here is what to fix. Your other documents stay as they are.`],
    rows: d.reasons.map((r) => ({ label: r.item, value: r.reason })),
    button: { label: "Fix it in Verification", href: d.statusUrl },
  };
}

// Listing needs changes (673:287) and Listing approved (831:1006), step 8.3. Words as drawn.

export interface ListingDetails {
  name: string;
  company: string;
  product: string;
  /** "PE-250" (the model) or the product name when there is none. */
  code: string;
  category: string;
  editUrl: string;
  liveUrl: string;
}

export function listingNeedsChangesMessage(d: ListingDetails & { changes: string[]; live: boolean }): Message {
  const n = d.changes.length;
  const words = `${String(n)} ${n === 1 ? "change" : "changes"}`;
  return {
    subject: `${words} needed: ${d.product}`,
    preview: d.live ? "The live version stays up while you fix this." : "Fix these and send it back for review.",
    reason: `You're getting this because you manage ${d.company}'s catalogue.`,
    eyebrow: `Listing ${d.code} · needs changes`,
    headline: `Your listing needs ${words}`,
    paragraphs: [
      `Hi ${first(d.name)}, the catalogue team reviewed ${d.product}.${d.live ? " The live version stays up while you fix this." : ""}`,
    ],
    rows: [
      { label: "Product", value: d.code === d.product ? d.product : `${d.product} · ${d.code}` },
      { label: "Category", value: d.category },
      ...d.changes.map((c, i) => ({ label: `Change ${String(i + 1)}`, value: c })),
    ],
    button: { label: "Edit listing", href: d.editUrl },
    links: [{ label: "Preview as buyer", href: d.liveUrl }],
  };
}

export function listingApprovedMessage(
  d: ListingDetails & { checkedAgainst: string | null; reviewed: string },
): Message {
  return {
    subject: `Approved: ${d.code === d.product ? d.product : `${d.code} ${d.product}`} is live on H2 India`,
    preview: "Buyers can now find it in search and on your storefront, and send you RFQs.",
    reason: "You're getting this because you list products on H2 India.",
    eyebrow: `Listing · ${d.code}`,
    headline: "Your listing is live",
    paragraphs: [
      `Hi ${first(d.name)}, we checked ${d.product}${d.checkedAgainst ? " against its datasheet" : ""} and approved it. It now shows in search, in its category and on your storefront.`,
    ],
    rows: [
      { label: "Product", value: d.product },
      ...(d.checkedAgainst ? [{ label: "Checked against", value: d.checkedAgainst }] : []),
      { label: "Status", value: "Live" },
      { label: "Reviewed", value: `${d.reviewed} by the H2 India catalogue team` },
    ],
    button: { label: "View your listing", href: d.liveUrl },
    links: [{ label: "Edit listing", href: d.editUrl }],
  };
}
