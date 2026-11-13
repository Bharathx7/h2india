// Sign-in rules (step 3.2). Safe to import in the browser: no database, no secrets.
// Numbers: Figma 524:1840 and 524:2036 (10-minute code, 15-minute pause) and decision A2 (founder, 11 Nov 2026).

export const SIGN_IN = {
  codeLength: 6,
  codeMinutes: 10,
  wrongCodesBeforePause: 5,
  pauseMinutes: 15,
  codesPerEmailPerHour: 5,
  resendSeconds: 30,
  sessionDays: 7,
} as const;

/** Error codes the sign-in screens map to the designed messages. */
export const SIGN_IN_ERROR = {
  wrongCode: "INVALID_OTP",
  expiredCode: "OTP_EXPIRED",
  paused: "SIGN_IN_PAUSED",
  tooManyCodes: "TOO_MANY_CODES",
  resendTooSoon: "RESEND_TOO_SOON",
  suspended: "ACCOUNT_SUSPENDED",
} as const;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

const NO_RETURN = ["/sign-in", "/sign-out", "/api/"];

/**
 * Where to send someone after signing in: a path on this site only, never another site, never back to sign-in.
 * Anything else falls back to the home page.
 */
export function safeReturnPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Control characters (tabs, new lines) let browsers read "/\t/evil.example" as another site.
  for (let i = 0; i < next.length; i++) if (next.charCodeAt(i) < 32 || next.charCodeAt(i) === 127) return fallback;
  let url: URL;
  try {
    url = new URL(next, "https://h2india.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://h2india.invalid") return fallback;
  if (NO_RETURN.some((p) => url.pathname === p || url.pathname.startsWith(p.endsWith("/") ? p : `${p}/`))) {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export { formatIstTime } from "../time";
