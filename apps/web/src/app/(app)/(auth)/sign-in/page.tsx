import type { Metadata } from "next";
import { SignInScreen } from "./screen";

// Step 3.2: Sign in (Figma 524:1773, 390: 526:508), Enter code (524:1840), wrong code (524:1930),
// locked (524:2036). Buyers and suppliers sign in here (members have /member/sign-in); on the admin domain, staff.

export const metadata: Metadata = { title: "Sign in · H2 India", robots: { index: false } };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <SignInScreen {...await searchParams} />;
}
