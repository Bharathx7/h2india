import { ACCOUNT_PAGES } from "@h2india/core/sign-in";

// Links used by the sign-in, join and recovery pages (Figma page 12). Since public QC 2 (16 Nov 2026) buyers,
// suppliers and members each have their own sign-in and sign-up page (ACCOUNT_PAGES).
export const AUTH_LINKS = {
  /** Staff on the admin domain; on the public site it opens Buyer sign in. */
  signIn: "/sign-in",
  /** H2 Economy staff: email and password (A183). The admin domain's /sign-in shows the same form. */
  staffSignIn: "/sign-in/staff",
  /** Staff: get a link to set or reset the password. */
  staffPassword: "/sign-in/staff/password",
  /** Where the emailed link lands to choose the new password. */
  staffNewPassword: "/sign-in/staff/new",
  /** The choice of account for old links; new links go straight to a sign-up page. */
  join: "/join",
  buyerSignIn: ACCOUNT_PAGES.buyer.signIn,
  supplierSignIn: ACCOUNT_PAGES.supplier.signIn,
  memberSignIn: ACCOUNT_PAGES.member.signIn,
  joinBuyer: ACCOUNT_PAGES.buyer.join,
  joinSupplier: ACCOUNT_PAGES.supplier.join,
  joinMember: ACCOUNT_PAGES.member.join,
  /** "Trouble signing in?": the Forgot access hub (step 3.5). */
  forgotAccess: "/forgot-access",
  contactSupport: "/help",
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  help: "/help",
} as const;
