import { parseServerEnv } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffSignInScreen } from "../screen";

// The back-office sign-in, email and password (A183). The admin domain's /sign-in shows the same form; locally
// (SITE_ROLE=both) this is where staff sign in, and the back office sends operators here when their session wasn't
// made with a password. The public site has no staff sign-in.

export const metadata: Metadata = { title: "Staff sign in · H2 Economy", robots: { index: false } };

export default async function StaffSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (parseServerEnv().SITE_ROLE === "public") notFound();
  const params = await searchParams;
  return <StaffSignInScreen next={params.next} error={params.error} />;
}
