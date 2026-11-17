import { parseServerEnv } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewPasswordForm } from "./NewPasswordForm";

// Where the emailed "Set password" link lands (A183): Better Auth checks the link and adds ?token=, or ?error=
// INVALID_TOKEN when it has expired or was used.

export const metadata: Metadata = { title: "Choose a password · H2 Economy", robots: { index: false } };

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  if (parseServerEnv().SITE_ROLE === "public") notFound();
  const { token, error } = await searchParams;
  return <NewPasswordForm token={error ? undefined : token} />;
}
