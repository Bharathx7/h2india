"use server";

import { getDb } from "@h2india/core";
import { joinProfile, membershipsOf } from "@h2india/core/companies";
import { safeReturnPath } from "@h2india/core/sign-in";
import { getSession } from "@/server/auth";

/**
 * Where to go once signed in: the page the person came from, unless they have not finished joining. An email with
 * no account gets an account at sign-in and then goes through Join (decision A1).
 */
export async function whereNext(next: string): Promise<string> {
  const session = await getSession();
  const back = safeReturnPath(next);
  if (!session) return back;
  // An invitation link brings people back to accept it, even before they have joined (admin QC, 16 Nov 2026).
  if (back.startsWith("/invite/")) return back;
  const profile = await joinProfile(session.user.id);
  if (!profile?.profileType) return "/join";
  if (profile.profileType === "member") return back;
  const companies = await membershipsOf(getDb(), session.user.id);
  return companies.length > 0 ? back : "/join";
}
