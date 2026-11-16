"use server";

import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import { hasOperatorRole } from "@h2india/core/authz";
import { joinProfile, membershipsOf } from "@h2india/core/companies";
import { ACCOUNT_KINDS, landingAfterSignIn, safeReturnPath, siteSignIn, type AccountKind } from "@h2india/core/sign-in";
import { headers } from "next/headers";
import { auth, getSession } from "@/server/auth";

/**
 * Where to go once signed in: the page the person came from, unless they have not finished joining. Signing in never
 * creates an account (public QC 2, 16 Nov 2026), so a person without a finished Join is one who confirmed their email
 * and stopped, or was invited. From the buyer, supplier or member page (`audience`), the wrong page signs the person
 * in to their own dashboard with a note (`landingAfterSignIn`).
 */
export async function whereNext(next: string, audience?: AccountKind): Promise<string> {
  const session = await getSession();
  const back = safeReturnPath(next);
  if (!session) return back;
  // The admin domain signs in H2 Economy staff only (public QC, 16 Nov 2026). Anyone else is signed out again here
  // and told to use the public site; staff go on to the back office, where the passkey step still applies.
  const role = parseServerEnv().SITE_ROLE;
  if (role === "admin") {
    const site = siteSignIn(role, await hasOperatorRole(getDb(), session.user.id), back);
    if (!site.ok) {
      await auth.api.signOut({ headers: await headers() });
      return `/sign-in?error=${site.reason}`;
    }
    return site.to;
  }
  // An invitation link brings people back to accept it, even before they have joined (admin QC, 16 Nov 2026).
  if (back.startsWith("/invite/")) return back;
  const profile = await joinProfile(session.user.id);
  const companies =
    profile?.profileType && profile.profileType !== "member" ? await membershipsOf(getDb(), session.user.id) : [];
  const has: AccountKind | null =
    profile?.profileType === "member"
      ? "member"
      : companies[0]
        ? companies[0].kind === "supplier"
          ? "supplier"
          : "buyer"
        : null;
  // The page is the browser's word: only the three account pages count.
  const page = ACCOUNT_KINDS.find((k) => k === audience);
  if (!page) {
    if (!profile?.profileType) return "/join";
    return has ? back : "/join";
  }
  // Staff who use a public page go where they were going.
  if (!has && (await hasOperatorRole(getDb(), session.user.id))) return back;
  // A buyer or supplier who confirmed their email but has no company yet finishes their own sign-up.
  if (!has && (profile?.profileType === "buyer" || profile?.profileType === "supplier")) {
    return `/join/${profile.profileType}`;
  }
  return landingAfterSignIn(page, has, back).to;
}
