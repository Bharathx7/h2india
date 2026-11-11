import { safeReturnPath } from "@h2india/core/sign-in";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
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

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: raw, error } = await searchParams;
  const next = await returnPath(raw);
  if (await getSession()) redirect(next);
  const initialError =
    error === "google"
      ? { title: "Google sign-in didn't finish", body: "Try again, or use a passkey or an email code." }
      : undefined;
  return <SignInFlow next={next} initialError={initialError} />;
}
