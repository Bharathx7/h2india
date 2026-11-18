import { isEnabled, parseServerEnv } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffSignIn } from "../staff/StaffSignIn";
import { testerLanding } from "./actions";

// Test-account sign-in (founder, 18 Nov 2026): the shared buyer, supplier and member accounts made with
// `pnpm testers:create` sign in here with their password while the testerSignIn switch is on. The public site only
// (the admin domain signs in staff only); a page that doesn't exist otherwise. Core decides who may use a password
// (sign-in/testers.ts); this page only offers the form.

export const metadata: Metadata = { title: "Test account sign in · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const WORDS = {
  title: "Sign in to a test account",
  intro: "For the shared buyer, supplier and member test accounts. Use the email and password you were given.",
  emailLabel: "Email",
};

export default function TesterSignInPage() {
  if (!isEnabled("testerSignIn") || parseServerEnv().SITE_ROLE === "admin") notFound();
  return <StaffSignIn next="/" words={WORDS} passwordLink={false} landing={testerLanding} />;
}
