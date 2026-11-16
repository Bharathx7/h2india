import { getDb } from "@h2india/core";
import { memberProfile } from "@h2india/core/members";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { Onboarding } from "./Onboarding";

// Member onboarding (531:8), step 7.1. Offered once, after joining; finished or skipped, it isn't shown again.
export const metadata: Metadata = { title: "Welcome · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getSession();
  if (!session) redirect("/member/sign-in?next=/member/welcome");
  const p = await memberProfile(getDb(), session.user.id);
  if (p?.onboardedAt) redirect("/member");
  const firstName = (session.user.name || "").split(/\s+/)[0] ?? "";
  return (
    <Onboarding
      firstName={firstName}
      initial={{ persona: p?.persona ?? null, topics: p?.topics ?? [], states: p?.states ?? [] }}
    />
  );
}
