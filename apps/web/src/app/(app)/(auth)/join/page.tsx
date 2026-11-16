import { getDb } from "@h2india/core";
import { joinProfile, latestJoinRequest, membershipsOf, readDraft } from "@h2india/core/companies";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { draftToken, workspaceFor } from "@/server/join";
import { JoinFlow, type JoinStep } from "./JoinFlow";

// Step 3.3: Join steps 1 to 4 (Figma 525:8; 390: 526:560). Done, Verify email and Join request have their own pages.

export const metadata: Metadata = { title: "Join · H2 India", robots: { index: false } };

const PATHS = ["buyer", "supplier", "member"] as const;

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ step?: string; as?: string }> }) {
  const { step: wanted, as } = await searchParams;
  // ?as= (For Buyers, For Members) picks the first step's option; the person can still change it.
  const preferred = PATHS.find((p) => p === as) ?? null;
  const session = await getSession();
  const draft = await readDraft(await draftToken());

  let step: JoinStep = "path";
  let kind: "buyer" | "supplier" | null = null;
  if (session) {
    const companies = await membershipsOf(getDb(), session.user.id);
    if (companies[0]) redirect(workspaceFor(companies[0].kind));
    const profile = await joinProfile(session.user.id);
    if (profile?.profileType === "member") redirect("/member");
    if (wanted !== "company") {
      const request = await latestJoinRequest(session.user.id);
      if (request && request.status !== "Approved") redirect("/join/request");
    }
    if (profile?.profileType === "buyer" || profile?.profileType === "supplier") {
      kind = profile.profileType;
      step = "company";
    }
  }

  return (
    <JoinFlow
      initialStep={step}
      kind={kind}
      preferred={preferred}
      signedInEmail={session?.user.email ?? null}
      draft={{
        path: draft?.path ?? null,
        mobile: draft?.mobile ?? null,
        mobileVerified: draft?.mobileVerified ?? false,
        fullName: draft?.fullName ?? (session?.user.name || null),
        jobRole: draft?.jobRole ?? null,
        email: draft?.email ?? null,
      }}
    />
  );
}
