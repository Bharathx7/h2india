import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import { hasOperatorRole } from "@h2india/core/authz";
import { safeReturnPath } from "@h2india/core/sign-in";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { whereNext } from "./actions";
import { SignInFlow } from "./SignInFlow";

// Step 3.2: Sign in (Figma 524:1773, 390: 526:508), Enter code (524:1840), wrong code (524:1930),
// locked (524:2036). "You'll come back to the page you were on": ?next= when a page sends people here,
// otherwise the page they clicked Sign in on (same site only).

export const metadata: Metadata = { title: "Sign in · H2 India", robots: { index: false } };

async function returnPath(next: string | undefined): Promise<string> {
  if (next) return safeReturnPath(next);
  const h = await headers();
  const referer = h.get("referer");
  const host = h.get("host");
  if (!referer || !host) return "/";
  try {
    const url = new URL(referer);
    return url.host === host ? safeReturnPath(`${url.pathname}${url.search}`) : "/";
  } catch {
    return "/";
  }
}

const NOT_STAFF = {
  title: "This sign-in is for H2 India staff",
  body: "Buyers, suppliers and members sign in on the H2 India website.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: raw, error } = await searchParams;
  const next = await returnPath(raw);
  const staffOnly = parseServerEnv().SITE_ROLE === "admin";
  const session = await getSession();
  if (session) {
    // On the admin domain a signed-in person who isn't staff is shown why, with Sign out: a page can't sign them out
    // while it draws (whereNext does it after a fresh sign-in).
    if (staffOnly && !(await hasOperatorRole(getDb(), session.user.id))) {
      return <SignInFlow next={next} staffOnly signedInElsewhere initialError={NOT_STAFF} />;
    }
    redirect(await whereNext(next));
  }
  const initialError =
    error === "google"
      ? { title: "Google sign-in didn't finish", body: "Try again, or use a passkey or an email code." }
      : error === "not-staff"
        ? NOT_STAFF
        : undefined;
  return <SignInFlow next={next} staffOnly={staffOnly} initialError={initialError} />;
}
