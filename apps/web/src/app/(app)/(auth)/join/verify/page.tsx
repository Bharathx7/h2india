import { readDraft } from "@h2india/core/companies";
import type { Metadata } from "next";
import { draftToken } from "@/server/join";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";
import { VerifyActions } from "./VerifyActions";

// Verify email (Figma 365:27778): Check your inbox (527:158, 390: 528:734) and Link expired (527:192).
export const metadata: Metadata = { title: "Check your inbox · H2 Economy", robots: { index: false } };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; error?: string }>;
}) {
  const { expired, error } = await searchParams;
  const draft = await readDraft(await draftToken());
  const email = draft?.email ?? "your email";
  if (expired || error) {
    return (
      <AuthCard>
        <StatusIcon name="alert-triangle" tone="warning" />
        <h1 className="type-h2 text-primary">This link has expired</h1>
        <p className="type-body text-body">Links work for 24 hours. We&apos;ll send a new one to {email}.</p>
        <VerifyActions
          mode="expired"
          canSend={Boolean(draft?.email)}
          back={draft?.path ? `/join/${draft.path}` : "/join"}
        />
      </AuthCard>
    );
  }
  return (
    <AuthCard>
      <StatusIcon name="mail" />
      <h1 className="type-h2 text-primary">Check your inbox</h1>
      <p className="type-body text-body">
        We sent a link to {email}. Open it to confirm your email. The link works for 24 hours.
      </p>
      <VerifyActions mode="sent" canSend={Boolean(draft?.email)} back={draft?.path ? `/join/${draft.path}` : "/join"} />
    </AuthCard>
  );
}
