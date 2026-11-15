import { getDb } from "@h2india/core";
import { claimTarget, myClaim } from "@h2india/core/companies";
import { Alert, buttonClasses, cx, Icon, Stepper } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";
import { getSession } from "@/server/auth";
import { ClaimFlow } from "./ClaimFlow";
import { JoinButton } from "./JoinButton";

// Claim this profile (492:5614): choose a method (493:8), company email code (493:387), GSTIN and letter (493:784),
// pending (494:8), approved (494:323), rejected with reason (494:371), already claimed with a join request (494:427).
// Every claim is approved by an operator (A137).
type Params = Promise<{ slug: string }>;
export const metadata: Metadata = { title: "Claim this profile · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/directory/companies/${slug}/claim`)}`);
  const db = getDb();
  const target = await claimTarget(db, slug);
  if (!target) notFound();
  const mine = await myClaim(db, session.user.id, target.organisationId);
  const step = mine?.status === "Pending" || mine?.status === "Approved" ? 3 : mine?.status === "Started" ? 2 : 1;

  let content;
  if (mine?.status === "Approved") {
    content = (
      <Alert tone="success" title={`You manage ${target.name} now`}>
        <p>Your claim was approved. Add your products, logo and locations from your supplier workspace.</p>
        <Link href="/supplier/storefront" className={cx(buttonClasses({ size: "sm" }), "mt-3")}>
          Open your storefront
        </Link>
      </Alert>
    );
  } else if (target.claimed) {
    content = (
      <div className="flex flex-col gap-4 rounded-card border border-default p-6">
        <h2 className="type-h3 text-primary">This profile has already been claimed</h2>
        <p className="type-body text-body">
          Someone from {target.name} already manages it. Ask them to add you to the team.
        </p>
        <JoinButton slug={slug} />
      </div>
    );
  } else if (mine?.status === "Pending") {
    content = (
      <Alert tone="info" title="We're checking your claim">
        {mine.emailVerifiedAt
          ? `Your company email is verified. Our team confirms the claim within 2 working days and emails you.`
          : `Our team reviews the GSTIN and the letter within 2 working days and emails you.`}
      </Alert>
    );
  } else {
    content = (
      <>
        {mine?.status === "Rejected" ? (
          <Alert tone="error" title="Your claim wasn't approved">
            {mine.reason ?? "Our team couldn't confirm it."} You can try again with another method.
          </Alert>
        ) : null}
        <ClaimFlow
          slug={slug}
          domain={target.domain}
          startedClaim={mine?.status === "Started" && mine.email ? { id: mine.id, email: mine.email } : null}
        />
      </>
    );
  }

  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16")}>
      <Crumbs
        items={[
          { label: "Directory", href: "/directory/companies" },
          { label: target.name, href: `/directory/companies/${slug}` },
          { label: "Claim" },
        ]}
      />
      <h1 className="type-h1 text-primary">Claim {target.name}</h1>
      <p className="type-body text-body">
        Prove you represent the company. With a company email it takes about two minutes.
      </p>
      <Stepper
        steps={[
          { label: "Choose a method", status: step > 1 ? "complete" : "current" },
          { label: "Verify", status: step > 2 ? "complete" : step === 2 ? "current" : "upcoming" },
          { label: "Review", status: step === 3 ? "current" : "upcoming" },
        ]}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">{content}</div>
        <aside className="flex flex-col gap-4 self-start">
          <div className="flex flex-col gap-1 rounded-card border border-default p-4">
            <p className="type-eyebrow text-secondary">You&apos;re claiming</p>
            <p className="type-label-lg text-primary">{target.name}</p>
            <p className="type-caption text-secondary">{[target.type, target.place].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-card bg-subtle p-4">
            <p className="type-label text-primary">Once your claim is approved you can</p>
            {[
              "Edit the profile, logo and locations",
              "Add products and reply to quote requests",
              "Post news, events and jobs",
              "Apply for the Verified supplier badge",
            ].map((x) => (
              <p key={x} className="flex items-center gap-2 type-body-sm text-body">
                <Icon name="check-circle" size={16} />
                {x}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
