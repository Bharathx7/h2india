import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import { hasOperatorRole } from "@h2india/core/authz";
import { ACCOUNT_PAGES, safeReturnPath, type AccountKind } from "@h2india/core/sign-in";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, staffSignedIn } from "@/server/auth";
import { whereNext } from "./actions";
import { SignInFlow } from "./SignInFlow";
import { StaffSignIn } from "./staff/StaffSignIn";

// The sign-in screen behind every sign-in page (public QC 2, 16 Nov 2026): /buyer/sign-in, /supplier/sign-in and
// /member/sign-in (email code only), and /sign-in (staff email and password on the admin domain, A183; locally the
// email code and Google screen with a link to the staff sign-in; on the public site it sends people to Buyer sign in).
// Passkeys were removed on 17 Nov 2026.

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
  // The admin domain has only the staff sign-in, email and password.
  if (audience && staffOnly) redirect("/sign-in");
  if (staffOnly) return <StaffSignInScreen next={raw} error={error} />;
  const session = await getSession();
  if (session) {
    redirect(await whereNext(next, audience));
  }
  const initialError =
    error === "google"
      ? { title: "Google sign-in didn't finish", body: "Try again, or use an email code." }
      : undefined;
  return <SignInFlow next={next} audience={audience} initialError={initialError} />;
}

/**
 * The staff sign-in (A183): the admin domain's /sign-in and /sign-in/staff. Someone already signed in with a password
 * goes on; staff signed in another way (an email code) sign in again with their password; anyone else is told this
 * sign-in is for staff, with Sign out.
 */
export async function StaffSignInScreen({ next: raw, error }: { next?: string; error?: string }) {
  const next = await returnPath(raw, "/admin");
  const session = await getSession();
  if (session) {
    const staff = await hasOperatorRole(getDb(), session.user.id);
    if (!staff) return <StaffSignIn next={next} signedInElsewhere initialError={NOT_STAFF} />;
    if (await staffSignedIn()) redirect(await whereNext(next));
  }
  return <StaffSignIn next={next} initialError={error === "not-staff" ? NOT_STAFF : undefined} />;
}
