import type { Metadata } from "next";
import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { jobPosters } from "@h2india/core/opportunities";
import { cx, EmptyState } from "@h2india/ui";
import Link from "next/link";
import { Crumbs, wrap } from "@/opportunities/parts";
import { getSession } from "@/server/auth";
import { PressReleaseForm } from "@/submissions/forms";
import { SideBoxes, SignedOut } from "@/submissions/parts";

// Submit a press release (504:8, success 505:193; signed out 505:421; step 5.7). Press releases from verified
// companies are free and always labelled Press release when published.

export const metadata: Metadata = {
  title: "Submit a press release · H2 India",
  description: "Share company news with India's hydrogen industry. Every press release is reviewed and labelled.",
  alternates: { canonical: "/news/submit" },
};
export const dynamic = "force-dynamic";

export default async function SubmitPressReleasePage() {
  const session = await getSession().catch(() => null);
  const poster = session ? (await jobPosters(getDb(), await loadActor(getDb(), session.user.id)))[0] : undefined;
  return (
    <main id="main" className="min-h-screen bg-subtle pb-16 [&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "News", href: "/news" }, { label: "Submit a press release" }]} />
        <h1 className="mt-2 type-h1 text-primary">Submit a press release</h1>
        <p className="type-body text-body">
          Share company news with India&apos;s hydrogen industry. Every press release is reviewed and labelled before
          it&apos;s published.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        {!session ? (
          <div className="flex-1">
            <SignedOut what="a press release" next="/news/submit" />
          </div>
        ) : poster ? (
          <PressReleaseForm company={poster.name} contact={{ name: session.user.name, email: session.user.email }} />
        ) : (
          <div className="flex-1 rounded-card border border-default bg-page py-8">
            <EmptyState
              kind="first-use"
              icon="building"
              title="Press releases come from companies"
              action={
                <Link href="/list-your-company" className="type-label text-link underline">
                  List your company
                </Link>
              }
            >
              Join your company on H2 India, or list it, to send press releases.
            </EmptyState>
          </div>
        )}
        <SideBoxes
          next={[
            "We review it within 1 working day.",
            "We publish it with a Press release label, or ask you for changes.",
            "You'll get an email either way, with your reference number.",
          ]}
          guidelines={[
            "News about your company, not advertising",
            "Give a source for every figure",
            "No more than two links in the body",
            "Embargoed releases stay hidden until the time you set",
          ]}
          money={{
            title: "Free or paid",
            text: "Press releases from verified companies are free to publish. They're always labelled Press release.",
          }}
        />
      </div>
    </main>
  );
}
