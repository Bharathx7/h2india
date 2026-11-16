import { getDb } from "@h2india/core";
import { agreedToTerms, invitationFor } from "@h2india/core/supplier";
import { Alert, buttonClasses } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInvite } from "@/supplier/AcceptInvite";
import { getSession } from "@/server/auth";

// Accept an invitation (Invitation email 673:155), step 8.7: the person signs in with a code sent to the invited
// email, then joins the company with the role the admin chose.
export const metadata: Metadata = { title: "Join your team · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [found, session] = await Promise.all([invitationFor(getDb(), token), getSession().catch(() => null)]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-16">
      {!found || found.state !== "open" ? (
        <Alert tone="error" title="This invitation can't be used any more">
          It may have expired or been cancelled. Ask a company admin to invite you again.
        </Alert>
      ) : (
        <>
          <h1 className="type-h2">Join {found.company} on H2 India</h1>
          <p className="type-body text-body">
            You&apos;re invited as {found.role}. Sign in with {found.email} to accept.
          </p>
          {session ? (
            <AcceptInvite
              token={token}
              workspace={found.workspace}
              needsTerms={!(await agreedToTerms(getDb(), session.user.id))}
            />
          ) : (
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
              className={buttonClasses({}) + " self-start"}
            >
              Sign in to accept
            </Link>
          )}
        </>
      )}
    </main>
  );
}
