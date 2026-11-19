import { readDraft } from "@h2india/core/companies";
import { PASSWORD_PAGES } from "@h2india/core/sign-in";
import { TextLink } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
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
        <p className="type-body text-body">
          {draft?.email
            ? `Links work for 24 hours and only once. We'll send a new one to ${email}.`
            : "Links work for 24 hours and only once. Start your sign-up again on this device to get a new one."}
        </p>
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
      {/* A195: the same words whether or not the email already has an account, so the page never reveals one. */}
      <p className="type-body-sm text-secondary">
        Already have an account with this email? The link signs you in, and your password stays the same. Forgot it?{" "}
        <TextLink asChild showIcon={false}>
          <Link href={PASSWORD_PAGES.forgot}>Reset your password</Link>
        </TextLink>
      </p>
      <VerifyActions mode="sent" canSend={Boolean(draft?.email)} back={draft?.path ? `/join/${draft.path}` : "/join"} />
    </AuthCard>
  );
}
