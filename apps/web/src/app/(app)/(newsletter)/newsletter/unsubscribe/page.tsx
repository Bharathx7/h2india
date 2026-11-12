import type { Metadata } from "next";
import { UnsubscribeButton } from "@/newsletter/forms";
import { StateCard } from "../card";

// Unsubscribe from India H₂ Weekly: the link in every issue's footer (step 5.9). Mail apps use the one-click
// List-Unsubscribe header instead (POST /api/newsletter/unsubscribe). Opening the page changes nothing until the
// button is pressed, so link scanners can't unsubscribe anyone.

export const metadata: Metadata = { title: "Unsubscribe · India H₂ Weekly", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return (
    <StateCard icon="mail" title="Unsubscribe from India H₂ Weekly?">
      <p className="type-body text-body">You&apos;ll stop getting the newsletter. Account emails are not affected.</p>
      <UnsubscribeButton token={token} />
    </StateCard>
  );
}
