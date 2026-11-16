import { parseServerEnv } from "@h2india/config";
import { ACCOUNT_PAGES } from "@h2india/core/sign-in";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInScreen } from "./screen";

// Step 3.2: Sign in (Figma 524:1773, 390: 526:508), Enter code (524:1840), wrong code (524:1930),
// locked (524:2036). Since public QC 2 (16 Nov 2026) buyers, suppliers and members have their own pages; on the public
// site /sign-in (old links, "sign in to continue" redirects) opens Buyer sign in, which links to the other two. The
// admin domain keeps the staff sign-in here, and locally (SITE_ROLE=both) it is the full screen with passkeys.

export const metadata: Metadata = { title: "Sign in · H2 Economy", robots: { index: false } };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (parseServerEnv().SITE_ROLE === "public") {
    const query = new URLSearchParams();
    if (params.next) query.set("next", params.next);
    if (params.error) query.set("error", params.error);
    const q = query.toString();
    redirect(`${ACCOUNT_PAGES.buyer.signIn}${q ? `?${q}` : ""}`);
  }
  return <SignInScreen {...params} />;
}
