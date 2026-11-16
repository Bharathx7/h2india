import type { Metadata } from "next";
import { SignInScreen } from "../../sign-in/screen";

// Member sign in (public QC, 16 Nov 2026): its own page, not part of /sign-in. The same sign-in screens (Figma
// 524:1772) with member wording; members land on their dashboard.

export const metadata: Metadata = { title: "Member sign in · H2 India", robots: { index: false } };

export default async function MemberSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <SignInScreen {...await searchParams} member />;
}
