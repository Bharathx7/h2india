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

/** What a supplier can upload; a site visit is recorded by H2 Economy. */
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

/**
 * Approving a supplier review needs at least this many checklist ticks. The desk's button always required two; since
 * 19 Nov 2026 (founder) core enforces it too, so no other caller can approve on fewer.
 */
export const MIN_DESK_CHECKS = 2;

/** How many of the desk checklist's checks are ticked; keys outside the checklist don't count. */
export const tickedDeskChecks = (checks: Record<string, boolean>) =>
  DESK_CHECKLIST.filter((c) => checks[c.key] === true).length;

/** Why a review can't be approved with these ticks, or null when it can. Shared by the desk and core. */
export function deskChecksProblem(checks: Record<string, boolean>): string | null {
  return tickedDeskChecks(checks) < MIN_DESK_CHECKS ? `Tick at least ${String(MIN_DESK_CHECKS)} checks` : null;
}

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

/**
 * What the records already prove for the desk checklist (founder, 19 Nov 2026): identity when the GST certificate and
 * PAN are verified and current, the bank when an Active payout account's name matched. The operator can untick either.
 * `tier1Missing` names the documents to verify before Approve can work; `waitingOn` is what the supplier still owes.
 */
export function deskEvidence(
  documents: { type: string; status: string; expiresOn: Date | null }[],
  bank: { status: string; nameMatches: boolean | null }[],
  now: Date = new Date(),
) {
  const current = (type: string) =>
    documents.some(
      (x) => x.type === type && x.status === "Verified" && (!x.expiresOn || x.expiresOn.getTime() > now.getTime()),
    );
  const label = (t: (typeof TIER_1)[number]) => DOCUMENT_TYPES[t].file;
  const tier1Missing = TIER_1.filter((t) => !current(t)).map(label);
  const bankOk = bank.some((x) => x.status === "Active" && x.nameMatches === true);
  const waitingOn: string[] = [];
  for (const t of TIER_1) {
    if (current(t)) continue;
    const doc = documents.find((x) => x.type === t);
    waitingOn.push(
      !doc
        ? `${label(t)} not uploaded`
        : doc.status === "Submitted"
          ? `${label(t)} uploaded, waiting for your check above`
          : `${label(t)} needs a new upload`,
    );
  }
  if (!bank.some((x) => x.status === "Active")) waitingOn.push("Payout bank account not confirmed");
  return {
    ticks: { identity: tier1Missing.length === 0, bank: bankOk } as Record<string, boolean>,
    tier1Missing,
    waitingOn,
  };
}
