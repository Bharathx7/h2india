import { Button } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINKS } from "@/lib/auth-links";
import { AuthCard } from "../AuthCard";

// Placeholder until step 3.5 builds account recovery (Figma 528:8). Linked from "Trouble signing in?".
export const metadata: Metadata = { title: "Trouble signing in · H2 India", robots: { index: false } };

export default function ForgotAccessPage() {
  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Trouble signing in?</h1>
      <p className="type-body text-body">
        Account recovery opens soon. If you can still read your work email, sign in with an email code.
      </p>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href={AUTH_LINKS.signIn}>Back to sign in</Link>
      </Button>
    </AuthCard>
  );
}
