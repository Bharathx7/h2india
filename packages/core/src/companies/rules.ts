// Join flow rules (step 3.3). Safe to import in the browser.

export type JoinPath = "buyer" | "supplier" | "member";

/** "Your role" options, decision A6. */
export const JOB_ROLES = [
  "Procurement or purchase",
  "Engineering",
  "Project management",
  "Operations or plant",
  "Management or founder",
  "Sales or business development",
  "Research or academia",
  "Consultant",
  "Other",
] as const;

export const JOIN = {
  /** Join requests expire after 14 days without an answer (365:27779). */
  requestDays: 14,
  /** One reminder a day (365:27779). */
  reminderHours: 24,
  /** The Verify email link works for 24 hours (365:27778, decision A7). */
  linkHours: 24,
  /** Wait before resending the link. Figma shows "You can resend in 0:45" counting down. */
  linkResendSeconds: 60,
  /** Mobile codes follow the sign-in code rules (decision A2). */
  mobileCodeMinutes: 10,
  mobileWrongTries: 5,
  mobileResendSeconds: 30,
  mobileCodesPerHour: 5,
} as const;

/** Indian mobile numbers: 10 digits starting 6 to 9, with or without +91. Returns "+91 98201 23456" or null. */
export function normaliseMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** "Greenfield Mobility Solutions Private Limited" → "Greenfield Mobility Solutions", as the screens write it. */
export function shortCompanyName(legalName: string): string {
  return legalName.replace(/\s+(private\s+limited|pvt\.?\s+ltd\.?|limited|ltd\.?|llp)$/i, "").trim() || legalName;
}

/** What the GSTIN step can show (Figma 526:8). */
export type GstinState =
  | { state: "invalid_format" }
  | { state: "valid"; gstin: string; pan: string; legalName: string; stateName: string; city: string; address: string }
  | { state: "not_found"; gstin: string }
  | { state: "inactive"; gstin: string; status: "Inactive" | "Cancelled"; legalName: string }
  | { state: "already_registered"; gstin: string; organisationId: string; name: string; members: number }
  | { state: "pending"; gstin: string; pan: string; stateName: string }
  | {
      state: "several";
      pan: string;
      gstins: { gstin: string; stateName: string; city: string }[];
      legalName: string;
    };
