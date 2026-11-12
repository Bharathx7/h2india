import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@h2india/ui";
import { CONFIRM_HOURS } from "@h2india/core/newsletter";
import { SendLinkAgain } from "@/newsletter/forms";
import { StateCard } from "../card";

// Sign-up · check your inbox (448:7048). The address arrives masked (a••••@greenfieldh2.in).

export const metadata: Metadata = { title: "Check your inbox · India H₂ Weekly", robots: { index: false } };

export default async function CheckInboxPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const to = ((await searchParams).to ?? "").slice(0, 120);
  return (
    <StateCard icon="mail" title="Check your inbox">
      <p className="type-body text-body">
        We&apos;ve sent a confirmation link to {to || "your email"}. Click it within {CONFIRM_HOURS} hours to start
        getting India H₂ Weekly.
      </p>
      <p className="type-caption text-secondary">Can&apos;t find it? Check your spam or Promotions folder.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <SendLinkAgain label="Resend link" />
        <Link href="/newsletter" className={buttonClasses({ variant: "ghost" })}>
          Use a different email
        </Link>
      </div>
    </StateCard>
  );
}
