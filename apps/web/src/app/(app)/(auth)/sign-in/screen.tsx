import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import { hasOperatorRole } from "@h2india/core/authz";
import { ACCOUNT_PAGES, safeReturnPath, type AccountKind } from "@h2india/core/sign-in";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { whereNext } from "./actions";
import { SignInFlow } from "./SignInFlow";

// The sign-in screen behind every sign-in page (public QC 2, 16 Nov 2026): /buyer/sign-in, /supplier/sign-in and
// /member/sign-in (email code only), and /sign-in (staff on the admin domain; locally the full screen with passkeys;
// on the public site it sends people to Buyer sign in). Same accounts and codes; the words and landing differ.

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
  title: "This sign-in is for H2 Economy staff",
  body: "Buyers, suppliers and members sign in on the H2 Economy website.",
};

export async function SignInScreen({
  next: raw,
  error,
  audience,
}: {
  next?: string;
  error?: string;
  /** The buyer, supplier or member page (public QC 2); none for the staff and local sign-in at /sign-in. */
  audience?: AccountKind;
}) {
  // Each account page lands on its dashboard unless a page sent the person there.
  const next = audience ? (raw ? safeReturnPath(raw) : ACCOUNT_PAGES[audience].home) : await returnPath(raw, "/");
  const role = parseServerEnv().SITE_ROLE;
  const staffOnly = role === "admin";
  // The admin domain has only the staff sign-in.
  if (audience && staffOnly) redirect("/sign-in");
  const session = await getSession();
  if (session) {
    // On the admin domain a signed-in person who isn't staff is shown why, with Sign out: a page can't sign them out
    // while it draws (whereNext does it after a fresh sign-in).
    if (staffOnly && !(await hasOperatorRole(getDb(), session.user.id))) {
      return <SignInFlow next={next} staffOnly signedInElsewhere initialError={NOT_STAFF} />;
    }
    redirect(await whereNext(next, audience));
  }
  const initialError =
    error === "google"
      ? { title: "Google sign-in didn't finish", body: "Try again, or use a passkey or an email code." }
      : error === "not-staff"
        ? NOT_STAFF
        : undefined;
  return <SignInFlow next={next} staffOnly={staffOnly} audience={audience} initialError={initialError} />;
}
