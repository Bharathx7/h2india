// Verification documents, tiers and badges (step 8.2; How verification works 95:1428, 586:8, 635:9). Pure: the
// supplier page, the operator desk and the engine share these lists. Safe in the browser.

export const DOCUMENT_TYPES = {
  gstin: { label: "GSTIN", file: "GST certificate", number: true, expires: true },
  pan: { label: "PAN", file: "PAN card", number: true, expires: false },
  cin: { label: "CIN", file: "Certificate of incorporation", number: true, expires: false },
  udyam: { label: "Udyam registration", file: "Udyam certificate", number: true, expires: false },
  factory_licence: { label: "Factory licence", file: "Factory licence", number: true, expires: true },
  certificate: { label: "Certificate", file: "Certificate", number: true, expires: true },
  dpiit: { label: "DPIIT recognition", file: "DPIIT certificate", number: true, expires: true },
  site_visit: { label: "Site visit", file: "Visit report", number: false, expires: false },
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;
export const isDocumentType = (v: string): v is DocumentType => v in DOCUMENT_TYPES;

/** What a supplier can upload; a site visit is recorded by H2 India. */
export const UPLOADABLE: DocumentType[] = ["gstin", "pan", "cin", "udyam", "factory_licence", "certificate", "dpiit"];

export const DOCUMENT_TRANSITIONS = {
  Submitted: ["Verified", "Needs re-upload", "Rejected"],
  Verified: ["Expired"],
  "Needs re-upload": [],
  Rejected: [],
  Expired: [],
} as const;

/** Tier 1 (Verified) needs these verified, plus the bank account (step 8.6); Tier 2 adds the factory and the visit. */
export const TIER_1: DocumentType[] = ["gstin", "pan"];
export const TIER_2: DocumentType[] = [...TIER_1, "factory_licence", "site_visit"];

export const BADGE_KINDS = {
  verified_supplier: { label: "Verified supplier", needs: TIER_1 },
  site_verified: { label: "Site-verified", needs: TIER_2 },
  sight_awardee: { label: "SIGHT awardee", needs: [] },
  made_in_india_self: { label: "Made in India · self-declared", needs: [] },
  made_in_india_verified: { label: "Made in India · verified", needs: ["factory_licence"] },
  dpiit: { label: "DPIIT recognised", needs: ["dpiit"] },
} as const satisfies Record<string, { label: string; needs: readonly DocumentType[] }>;

export type BadgeKind = keyof typeof BADGE_KINDS;
export const isBadgeKind = (v: string): v is BadgeKind => v in BADGE_KINDS;

/** Revoke badge reasons (636:436). */
export const REVOKE_REASONS = [
  "Certificate couldn't be confirmed",
  "Document expired and not renewed",
  "Details don't match the company",
  "Complaint upheld after review",
  "Other",
] as const;

/** The operator's Verification checklist (635:9). */
export const DESK_CHECKLIST = [
  { key: "identity", label: "Company identity: GST registration and incorporation" },
  { key: "bank", label: "Bank account in the company's name" },
  { key: "signatory", label: "Authorised signatory confirmed" },
  { key: "site", label: "Site or factory evidence" },
  { key: "certificates", label: "Product certificates current" },
] as const;

const DAY = 86_400_000;

/** The status words on 586:8 and 635:9: "Verified", "Expires in 30 days", "Needs re-upload", "Rejected"... */
export function documentStatusWord(
  d: { status: string; expiresOn: Date | null; visitAt?: Date | null },
  now: Date,
  noticeDays: number,
): { word: string; tone: "success" | "warning" | "error" | "neutral" | "progress" } {
  if (d.status === "Verified" && d.expiresOn) {
    const days = Math.ceil((d.expiresOn.getTime() - now.getTime()) / DAY);
    if (days <= noticeDays) return { word: `Expires in ${String(Math.max(0, days))} days`, tone: "warning" };
  }
  switch (d.status) {
    case "Verified":
      return { word: "Verified", tone: "success" };
    case "Needs re-upload":
      return { word: "Needs re-upload", tone: "warning" };
    case "Rejected":
      return { word: "Rejected", tone: "error" };
    case "Expired":
      return { word: "Expired", tone: "error" };
    default:
      return { word: "Pending", tone: "progress" };
  }
}

/** "GSTIN", "ISO 22734", "Site visit" */
export const documentTitle = (d: { type: string; name: string | null }) =>
  d.name ?? (isDocumentType(d.type) ? DOCUMENT_TYPES[d.type].label : d.type);
