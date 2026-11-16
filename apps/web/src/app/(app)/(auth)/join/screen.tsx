import { getDb } from "@h2india/core";
import type { JoinPath } from "@h2india/core/companies/client";
import { joinProfile, latestJoinRequest, membershipsOf, readDraft } from "@h2india/core/companies";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { draftToken, workspaceFor } from "@/server/join";
import { JoinFlow, type JoinStep } from "./JoinFlow";

// Step 3.3: Join steps 1 to 4 (Figma 525:8; 390: 526:560). Done, Verify email and Join request have their own pages.
// Public QC 2 (16 Nov 2026): /join/buyer, /join/supplier and /join/member are the sign-up pages (`fixed`); /join keeps
// the choice for old links.

const PATHS = ["buyer", "supplier", "member"] as const;

export async function JoinScreen({ fixed, wanted, as }: { fixed?: JoinPath; wanted?: string; as?: string }) {
  // ?as= (old links) picks the choice step's option; the person can still change it.
  const preferred = PATHS.find((p) => p === as) ?? null;
  const session = await getSession();
  const draft = await readDraft(await draftToken());

  let step: JoinStep = fixed ? (fixed === "member" ? "details" : "find") : "path";
  let kind: "buyer" | "supplier" | null = fixed === "buyer" || fixed === "supplier" ? fixed : null;
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
      // Someone who confirmed their email as a buyer or supplier finishes on their own page, never the shared /join.
      if (fixed !== profile.profileType) {
        redirect(`/join/${profile.profileType}${wanted === "company" ? "?step=company" : ""}`);
      }
      kind = profile.profileType;
      step = "company";
    }
  }

  return (
    <JoinFlow
      initialStep={step}
      kind={kind}
      preferred={preferred}
      fixedPath={fixed}
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
