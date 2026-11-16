import type { Metadata } from "next";
import { SignInScreen } from "../../sign-in/screen";

// Buyer sign in (public QC 2, 16 Nov 2026): its own page, email code only. The sign-in screens of Figma 524:1772 with this
// page's words; someone with another kind of account still gets in, to their own dashboard (landingAfterSignIn).

export const metadata: Metadata = { title: "Buyer sign in · H2 India", robots: { index: false } };

export default async function BuyerSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <SignInScreen {...await searchParams} audience="buyer" />;
}
