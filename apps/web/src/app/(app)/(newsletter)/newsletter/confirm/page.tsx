import { openLink, PREFERENCE_TOPICS, topicLabel } from "@h2india/core/newsletter";
import { Button, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { siteViewer } from "@/server/site";
import { Preferences, ResendLink } from "./forms";

// Sign-up · confirmed, choose topics (448:7157) and This link has expired (448:7392), brought forward from 5.9 (A46).
// Opening the emailed link confirms the subscription; the same page changes topics later ("Change your topics").

export const metadata: Metadata = { title: "India H₂ Weekly · H2 India", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-140 flex-col items-center gap-4 rounded-card border border-default bg-page p-6 text-center md:p-10">
      {children}
    </div>
  );
}

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const [opened, viewer] = await Promise.all([
    token ? openLink(token) : Promise.resolve({ ok: false as const, reason: "invalid" as const }),
    siteViewer(),
  ]);
  return (
    <main id="main" className="flex flex-col items-center gap-4 bg-subtle px-4 pt-12 pb-20 md:pt-20 md:pb-30">
      {opened.ok ? (
        <>
          <Card>
            <span className="flex size-16 items-center justify-center rounded-pill bg-success text-icon-primary">
              <Icon name="check-circle" size={28} />
            </span>
            <h1 className="type-h2 text-primary">You&rsquo;re subscribed</h1>
            <p className="type-body text-body">
              India H₂ Weekly arrives every Monday at 08:00 IST. Your first issue comes on {opened.link.firstIssue}.
            </p>
            <Preferences
              token={opened.link.token}
              topics={[
                ...PREFERENCE_TOPICS,
                ...opened.link.subscriber.topics.filter((t) => !PREFERENCE_TOPICS.includes(t as never)),
              ].map((key) => ({ key, label: topicLabel(key) }))}
              initial={{
                topics: opened.link.subscriber.topics,
                tenderDigest: opened.link.subscriber.tenderDigest,
                monthlyNote: opened.link.subscriber.monthlyNote,
              }}
            />
          </Card>
          {viewer ? null : (
            <div className="flex w-full max-w-140 flex-col items-start gap-2 rounded-card bg-mint p-5">
              <h2 className="type-h4 text-primary">Create a free account to get alerts</h2>
              <p className="type-body-sm text-body">
                Follow topics and companies, save searches and get an email when a tender or scheme matches.
              </p>
              <Button asChild variant="outline">
                <Link href="/join">Create free account</Link>
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <span className="flex size-16 items-center justify-center rounded-pill bg-warning text-icon-warning">
            <Icon name="clock" size={28} />
          </span>
          <h1 className="type-h2 text-primary">
            {opened.reason === "invalid" ? "This link doesn't work" : "This link has expired"}
          </h1>
          <p className="type-body text-body">
            {opened.reason === "invalid"
              ? "Enter your email and we'll send a new one."
              : "Confirmation links work for 48 hours. Enter your email and we'll send a new one."}
          </p>
          <ResendLink />
        </Card>
      )}
    </main>
  );
}
