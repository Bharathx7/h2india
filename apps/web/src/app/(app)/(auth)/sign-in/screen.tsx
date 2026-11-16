import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import { hasOperatorRole } from "@h2india/core/authz";
import { safeReturnPath } from "@h2india/core/sign-in";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { whereNext } from "./actions";
import { SignInFlow } from "./SignInFlow";

// The sign-in screen behind both sign-in pages: /sign-in (buyers and suppliers; staff on the admin domain) and
// /member/sign-in (members, public QC 16 Nov 2026). Same accounts and codes; only the wording and where people land
// differ.

/** "You'll come back to the page you were on": ?next=, otherwise the page they clicked Sign in on (same site only). */
async function returnPath(next: string | undefined, fallback: string): Promise<string> {
  if (next) return safeReturnPath(next);
  const h = await headers();
  const referer = h.get("referer");
  const host = h.get("host");
  if (!referer || !host) return fallback;
  try {
    const url = new URL(referer);
    return url.host === host ? safeReturnPath(`${url.pathname}${url.search}`) : fallback;
  } catch {
    return fallback;
  }
}

const NOT_STAFF = {
  title: "This sign-in is for H2 India staff",
  body: "Buyers, suppliers and members sign in on the H2 India website.",
};

export async function SignInScreen({
  next: raw,
  error,
  member = false,
}: {
  next?: string;
  error?: string;
  member?: boolean;
}) {
  // Members land on their dashboard unless a page sent them here (the For Members page doesn't count).
  const next = member ? (raw ? safeReturnPath(raw) : "/member") : await returnPath(raw, "/");
  const staffOnly = parseServerEnv().SITE_ROLE === "admin";
  // The admin domain has only the staff sign-in.
  if (member && staffOnly) redirect("/sign-in");
  const session = await getSession();
  if (session) {
    // On the admin domain a signed-in person who isn't staff is shown why, with Sign out: a page can't sign them out
    // while it draws (whereNext does it after a fresh sign-in).
    if (staffOnly && !(await hasOperatorRole(getDb(), session.user.id))) {
      return <SignInFlow next={next} staffOnly signedInElsewhere initialError={NOT_STAFF} />;
    }
    redirect(await whereNext(next, member));
  }
  const initialError =
    error === "google"
      ? { title: "Google sign-in didn't finish", body: "Try again, or use a passkey or an email code." }
      : error === "not-staff"
        ? NOT_STAFF
        : undefined;
  return <SignInFlow next={next} staffOnly={staffOnly} member={member} initialError={initialError} />;
}
