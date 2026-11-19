import { parseServerEnv } from "@h2india/config";
import { ACCOUNT_KINDS } from "@h2india/core/sign-in";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AUTH_LINKS } from "@/lib/auth-links";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// Forgot password for buyers, suppliers and members (founder, 19 Nov 2026, A195). The page says the same thing
// whatever the address; the link goes only to an email that has an account (auth.ts sendResetPassword). Staff on the
// admin domain use their own page.
export const metadata: Metadata = { title: "Forgot password · H2 Economy", robots: { index: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  if (parseServerEnv().SITE_ROLE === "admin") redirect(AUTH_LINKS.staffPassword);
  const { as } = await searchParams;
  return <ForgotPasswordForm audience={ACCOUNT_KINDS.find((k) => k === as)} />;
}
