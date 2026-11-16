import type { Metadata } from "next";
import { JoinScreen } from "../screen";

// Join as a member (public QC 2, 16 Nov 2026): the sign-up page for this kind of account. Join's own steps without the choice.

export const metadata: Metadata = {
  title: "Join as a member · H2 India",
  description: "Save, follow and set alerts for news, schemes, tenders and jobs.",
  robots: { index: false },
};

export default async function JoinMemberPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return <JoinScreen fixed="member" wanted={step} />;
}
