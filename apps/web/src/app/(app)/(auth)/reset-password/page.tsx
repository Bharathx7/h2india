import { ACCOUNT_KINDS } from "@h2india/core/sign-in";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

// Where the emailed reset link lands (A195): Better Auth checks the link and adds ?token=, or ?error=INVALID_TOKEN
// when it has expired or was used.
export const metadata: Metadata = { title: "Choose a new password · H2 Economy", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; as?: string }>;
}) {
  const { token, error, as } = await searchParams;
  return <ResetPasswordForm token={error ? undefined : token} audience={ACCOUNT_KINDS.find((k) => k === as)} />;
}
