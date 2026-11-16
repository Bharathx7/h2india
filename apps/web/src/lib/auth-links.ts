// Links used by the sign-in, join and recovery pages (Figma page 12).
export const AUTH_LINKS = {
  signIn: "/sign-in",
  join: "/join",
  /** Public QC, 16 Nov 2026: members have their own sign-in page and a Join link that picks Member. */
  joinMember: "/join?as=member",
  memberSignIn: "/member/sign-in",
  /** "Trouble signing in?": the Forgot access hub (step 3.5). */
  forgotAccess: "/forgot-access",
  contactSupport: "/help",
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  help: "/help",
} as const;
