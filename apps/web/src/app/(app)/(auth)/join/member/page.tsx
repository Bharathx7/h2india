import type { Metadata } from "next";
import { JoinScreen } from "../screen";
import { MemberBenefits } from "./Benefits";

// Join as a member (public QC 2, 16 Nov 2026): the sign-up page for this kind of account. Join's own steps without the choice.
// Founder v2, 18 Nov 2026: the benefits sit beside the form from 1024 px (the page widens past the auth frame's
// 560 px column there) and below it on phones and tablets, so the form stays first.

export const metadata: Metadata = {
  title: "Join as a member · H2 Economy",
  description: "Save, follow and set alerts for news, schemes, tenders and jobs.",
  robots: { index: false },
};

export default async function JoinMemberPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return (
    <div className="flex flex-col gap-4 md:gap-6 lg:relative lg:left-1/2 lg:w-[min(72rem,calc(100vw-4rem))] lg:-translate-x-1/2 lg:flex-row-reverse lg:items-start lg:gap-8">
      <div className="w-full lg:w-140 lg:shrink-0">
        <JoinScreen fixed="member" wanted={step} />
      </div>
      <div className="min-w-0 flex-1">
        <MemberBenefits />
      </div>
    </div>
  );
}
