import type { Metadata } from "next";
import { JoinScreen } from "../screen";

// Join as a member (public QC 2, 16 Nov 2026): the sign-up page for this kind of account. Join's own steps without the choice.
// Founder v2, 18 Nov 2026: the benefits are the brand panel's member content (AuthAside), beside the form.

export const metadata: Metadata = {
  title: "Join as a member · H2 Economy",
  description: "Save, follow and set alerts for news, schemes, tenders and jobs.",
  robots: { index: false },
};

export default async function JoinMemberPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  // The member benefits are in the sign-in and join brand panel (AuthAside), beside the form.
  return <JoinScreen fixed="member" wanted={step} />;
}
