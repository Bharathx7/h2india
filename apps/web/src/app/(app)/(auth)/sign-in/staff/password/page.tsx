import { parseServerEnv } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PasswordLinkForm } from "./PasswordLinkForm";

// Set or forgot your password (A183): staff ask for a link by email. The page says "Check your email" whatever the
// address, and only staff are ever sent a link (auth.ts sendResetPassword).

export const metadata: Metadata = { title: "Set your password · H2 Economy", robots: { index: false } };

export default function StaffPasswordPage() {
  if (parseServerEnv().SITE_ROLE === "public") notFound();
  return <PasswordLinkForm />;
}
