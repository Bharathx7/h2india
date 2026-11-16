"use server";

import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import { hasOperatorRole } from "@h2india/core/authz";
import { joinProfile, membershipsOf } from "@h2india/core/companies";
import { safeReturnPath, siteSignIn } from "@h2india/core/sign-in";
import { headers } from "next/headers";
import { auth, getSession } from "@/server/auth";
import { workspaceFor } from "@/server/join";

/**
 * Where to go once signed in: the page the person came from, unless they have not finished joining. An email with
 * no account gets an account at sign-in and then goes through Join (decision A1). From the member sign-in page
 * (`member`), a new person joins with Member picked, and a buyer or supplier who used it goes to their own workspace
 * instead of the member dashboard.
 */
export async function whereNext(next: string, member = false): Promise<string> {
  const session = await getSession();
  const back = safeReturnPath(next);
  if (!session) return back;
  // The admin domain signs in H2 India staff only (public QC, 16 Nov 2026). Anyone else is signed out again here
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
  const profile = await joinProfile(session.user.id);
  if (!profile?.profileType) return member ? "/join?as=member" : "/join";
  if (profile.profileType === "member") return back;
  const companies = await membershipsOf(getDb(), session.user.id);
  if (!companies[0]) return "/join";
  return member && back === "/member" ? workspaceFor(companies[0].kind) : back;
}
