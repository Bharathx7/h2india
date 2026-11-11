import { Button } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINKS } from "@/lib/auth-links";
import { AuthCard } from "../AuthCard";

// Placeholder until step 3.3 builds the join flow (Figma 525:8). Linked from "Join free" on the sign-in page.
export const metadata: Metadata = { title: "Join · H2 India", robots: { index: false } };

export default function JoinPage() {
  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Join H2 India</h1>
      <p className="type-body text-body">
        Joining opens soon. For now, sign in with an email code to create your account.
      </p>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href={AUTH_LINKS.signIn}>Back to sign in</Link>
      </Button>
    </AuthCard>
  );
}
