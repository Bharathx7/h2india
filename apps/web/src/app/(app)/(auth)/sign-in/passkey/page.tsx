import { getDb } from "@h2india/core";
import { safeReturnPath } from "@h2india/core/sign-in";
import { hasPasskey } from "@h2india/core/sign-in/step-up";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { operatorSession, passkeySignedIn } from "@/server/auth";
import { AuthCard } from "../../AuthCard";
import { PasskeyStep } from "./PasskeyStep";

// The back office needs a passkey sign-in (A172, step 12.1 review H2). An operator signed in another way confirms with
// their passkey here, or creates one first. Built from the sign-in design system (A178; listed in frames-to-check).
export const metadata: Metadata = { title: "Confirm with your passkey · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PasskeyStepPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = safeReturnPath(raw ?? "/admin");
  const session = await operatorSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (await passkeySignedIn()) redirect(next);
  return (
    <AuthCard>
      <PasskeyStep next={next} hasPasskey={await hasPasskey(getDb(), session.user.id)} />
    </AuthCard>
  );
}
