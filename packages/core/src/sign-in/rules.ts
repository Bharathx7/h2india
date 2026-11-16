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

/**
 * A plausible email address: one "@", something before it, a dot inside the part after it, no spaces, at most 254
 * characters. Checked by position, not a backtracking regular expression, so a long crafted input can't stall the
 * server (CodeQL js/polynomial-redos).
 */
export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 5 || v.length > 254 || /\s/.test(v)) return false;
  const at = v.indexOf("@");
  if (at < 1 || at !== v.lastIndexOf("@")) return false;
  const domain = v.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

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

/**
 * Which sign-in an app serves (public QC, 16 Nov 2026): the admin domain signs in H2 India staff only; the public
 * domain is unchanged. "both" is one app serving everything (local development and tests).
 */
export type SiteRole = "both" | "public" | "admin";

/** Where a signed-in person goes on this site: the admin site turns away anyone who isn't an operator. */
export function siteSignIn(
  role: SiteRole,
  operator: boolean,
  next: string,
): { ok: true; to: string } | { ok: false; reason: "not-staff" } {
  if (role !== "admin") return { ok: true, to: next };
  if (!operator) return { ok: false, reason: "not-staff" };
  return { ok: true, to: next === "/" ? "/admin" : next };
}

export { formatIstTime } from "../time";

/** The sign-in and sign-up pages for each kind of account (public QC 2, 16 Nov 2026). */
export const ACCOUNT_PAGES = {
  buyer: { signIn: "/buyer/sign-in", join: "/join/buyer", home: "/buyer" },
  supplier: { signIn: "/supplier/sign-in", join: "/join/supplier", home: "/supplier" },
  member: { signIn: "/member/sign-in", join: "/join/member", home: "/member" },
} as const;

export type AccountKind = keyof typeof ACCOUNT_PAGES;

export const ACCOUNT_KINDS = Object.keys(ACCOUNT_PAGES) as AccountKind[];

/** "buyer" from "/buyer/rfqs": the kind of workspace a path belongs to, if any. */
export function accountKindOfPath(path: string): AccountKind | null {
  return (
    ACCOUNT_KINDS.find((k) => path === ACCOUNT_PAGES[k].home || path.startsWith(`${ACCOUNT_PAGES[k].home}/`)) ?? null
  );
}

/**
 * Where a person goes after signing in on the page for `asked` (buyer, supplier or member), given the kind of account
 * they really have. The right page: the page they came from. The wrong page: their own dashboard, with a note naming
 * the page they used (`?signed-in-as=`). Someone who never finished joining goes to that page's sign-up.
 */
export function landingAfterSignIn(
  asked: AccountKind,
  has: AccountKind | null,
  back: string,
): { to: string; wrongPage: boolean } {
  if (!has) return { to: ACCOUNT_PAGES[asked].join, wrongPage: false };
  const target = accountKindOfPath(back);
  if (has === asked)
    return { to: target === null || target === has ? back : ACCOUNT_PAGES[has].home, wrongPage: false };
  // A page outside the workspaces (a product, /account) is still fine to return to.
  if (target === null && back !== "/") return { to: back, wrongPage: false };
  return { to: `${ACCOUNT_PAGES[has].home}?signed-in-as=${asked}`, wrongPage: true };
}
