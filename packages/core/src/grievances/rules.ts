// Grievance rules (step 5.8): the complaint form 519:8, the ticket 519:538 and the status lookup 519:588. Pure, so
// the browser shows the same messages as the server. The timelines are the clocks grievanceAcknowledge (24 hours)
// and grievanceResolve (15 days) in packages/config/src/clocks.ts (A24); pages read them from there.

export const GRIEVANCE_TYPES = ["Content", "Listing", "Privacy", "Payment", "Other"] as const;
export type GrievanceType = (typeof GRIEVANCE_TYPES)[number];

export const GRIEVANCE_STATUSES = ["Received", "Acknowledged", "In review", "Resolved"] as const;
export type GrievanceStatus = (typeof GRIEVANCE_STATUSES)[number];

/** Allowed moves for changeStatus(). Acknowledging can go straight to In review when the team starts at once. */
export const GRIEVANCE_TRANSITIONS: Record<GrievanceStatus, readonly GrievanceStatus[]> = {
  Received: ["Acknowledged"],
  Acknowledged: ["In review", "Resolved"],
  "In review": ["Resolved"],
  Resolved: [],
};

/** The team a complaint goes to first; an operator can change it. "assigned to the listings team" (519:588). */
export const GRIEVANCE_TEAM: Record<GrievanceType, string> = {
  Content: "the newsroom",
  Listing: "the listings team",
  Privacy: "the privacy team",
  Payment: "the payments team",
  Other: "the support team",
};

export const GRIEVANCE_LIMITS = { description: 3000, files: 5 };

export interface GrievanceInput {
  type: string;
  pageUrl: string;
  description: string;
  name: string;
  email: string;
  mobile: string;
  files?: string[];
}

export interface CheckedGrievance {
  type: GrievanceType;
  pageUrl: string | null;
  description: string;
  name: string;
  email: string;
  mobile: string | null;
  files: string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_OK = /^https?:\/\/[^\s/]+\.[^\s]+$/;

export function grievanceMobile(text: string): string | null {
  const digits = text.replace(/[\s-]/g, "").replace(/^\+?91/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export function checkGrievance(
  input: GrievanceInput,
): { ok: true; value: CheckedGrievance } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const type = GRIEVANCE_TYPES.find((t) => t === input.type);
  const pageUrl = input.pageUrl.trim();
  const description = input.description.trim();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const mobileText = input.mobile.trim();
  const mobile = mobileText ? grievanceMobile(mobileText) : null;
  const files = (input.files ?? []).filter((f) => typeof f === "string" && f.length > 0);
  if (!type) errors.type = "Choose the type of complaint";
  // The page link is required for everything but Other ("The page your complaint is about").
  if (type !== "Other" || pageUrl) {
    if (!URL_OK.test(pageUrl) || pageUrl.length > 500) errors.pageUrl = "Paste the link, starting with https://";
  }
  if (description.length < 20) errors.description = "Tell us what happened in a few sentences";
  else if (description.length > GRIEVANCE_LIMITS.description) errors.description = "Keep it under 3,000 characters";
  if (name.length < 2) errors.name = "Enter your full name";
  if (!EMAIL.test(email)) errors.email = "Enter an email, like you@example.com";
  if (mobileText && !mobile) errors.mobile = "Enter a 10-digit Indian mobile number";
  if (files.length > GRIEVANCE_LIMITS.files) errors.files = "Add up to 5 files";
  if (Object.keys(errors).length || !type) return { ok: false, errors };
  return { ok: true, value: { type, pageUrl: pageUrl || null, description, name, email, mobile, files } };
}

/** "GRV-2026-00318", as typed into Check a complaint; spaces and case are forgiven. */
export function normaliseTicket(text: string): string | null {
  const t = text.trim().toUpperCase().replace(/\s+/g, "");
  return /^GRV-\d{4}-\d{5,}$/.test(t) ? t : null;
}

export interface GrievanceView {
  reference: string;
  type: GrievanceType;
  status: GrievanceStatus;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  resolveBy: Date;
  team: string | null;
  publicNote: string | null;
  outcome: string | null;
}

export interface GrievanceStep {
  label: GrievanceStatus;
  state: "done" | "current" | "next";
  /** The time it happened, or null. */
  at: Date | null;
  /** The line under the step: the team, the note, or "By 25 Nov 2026" (rendered by the page). */
  note: string | null;
}

/** The four steps of the status lookup (519:588). */
export function grievanceSteps(g: GrievanceView): GrievanceStep[] {
  const reached = GRIEVANCE_STATUSES.indexOf(g.status);
  return GRIEVANCE_STATUSES.map((label, i) => {
    const state = i < reached || g.status === "Resolved" ? "done" : i === reached ? "current" : "next";
    if (label === "Received") return { label, state: "done", at: g.createdAt, note: null };
    if (label === "Acknowledged")
      return { label, state, at: g.acknowledgedAt, note: g.team ? `assigned to ${g.team}` : null };
    if (label === "In review") return { label, state, at: null, note: g.publicNote };
    return { label, state, at: g.resolvedAt, note: g.status === "Resolved" ? g.outcome : null };
  });
}
