import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@h2india/ui";
import { issues } from "@/newsletter/data";
import { SendLinkAgain } from "@/newsletter/forms";
import { StateCard } from "../card";

// Sign-up · already subscribed (448:7291). Manage preferences emails a fresh change-topics link, so nobody can change
// someone else's topics by typing their address.

export const metadata: Metadata = { title: "You're already subscribed · H2 Economy Weekly", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AlreadyPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const to = ((await searchParams).to ?? "").slice(0, 120);
  const latest = (await issues("weekly"))[0];
  return (
    <StateCard icon="info" title="You're already subscribed">
      <p className="type-body text-body">
        {to || "This address"} already gets H2 Economy Weekly. You can change topics or how often we write.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <SendLinkAgain label="Manage preferences" primary />
        <Link
          href={latest ? `/newsletter/issues/${latest.slug}` : "/newsletter"}
          className={buttonClasses({ variant: "outline" })}
        >
          Read the latest issue
        </Link>
      </div>
    </StateCard>
  );
}
