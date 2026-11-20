import { getDb } from "@h2india/core";
import { memberProfile } from "@h2india/core/members";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/member/shell";
import { getSession } from "@/server/auth";
import { Onboarding } from "./Onboarding";

// Member onboarding (531:8), step 7.1. Offered once, after joining; finished or skipped, it isn't shown again.
export const metadata: Metadata = { title: "Welcome · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  // Members only (founder QC, 17 Nov 2026), like the rest of the member area.
  const userId = await requireMember("/member/welcome");
  const session = await getSession();
  const p = await memberProfile(getDb(), userId);
  if (p?.onboardedAt) redirect("/member");
  const firstName = (session?.user.name || "").split(/\s+/)[0] ?? "";
  return (
    <Onboarding
      firstName={firstName}
      initial={{ persona: p?.persona ?? null, topics: p?.topics ?? [], states: p?.states ?? [] }}
    />
  );
}
