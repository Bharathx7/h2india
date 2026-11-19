import { readDraft } from "@h2india/core/companies";
import { normaliseEmail } from "@h2india/core/sign-in";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { draftToken } from "@/server/join";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";
import { ContinueButton } from "./ContinueButton";

// Email confirmed (Figma 527:217). The link has signed the person in; Continue copies their Join details to the
// account and takes them to the next step. The link carries its draft (?d=), so this works in any browser.
export const metadata: Metadata = { title: "Email confirmed · H2 Economy", robots: { index: false } };

const KIND_WORDS = { buyer: "a buyer account", supplier: "a supplier account", member: "a member account" } as const;

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/join/verify?expired=1");
  const { d } = await searchParams;
  const linkToken = typeof d === "string" && /^[\w-]{16,64}$/.test(d) ? d : undefined;
  // Show what Continue will finish, so someone who didn't start this sign-up can see it before going on.
  const draft = (await readDraft(linkToken)) ?? (await readDraft(await draftToken()));
  const mine = draft?.email && normaliseEmail(draft.email) === normaliseEmail(session.user.email) ? draft : null;
  return (
    <AuthCard>
      <StatusIcon name="check-circle" />
      <h1 className="type-h2 text-primary">Email confirmed</h1>
      <p className="type-body text-body">Thanks, {session.user.email} is confirmed.</p>
      {mine?.path ? (
        <p className="type-body-sm text-secondary">
          Next: finish {KIND_WORDS[mine.path]}
          {mine.fullName ? ` for ${mine.fullName}` : ""}.
        </p>
      ) : null}
      <ContinueButton linkToken={linkToken} />
    </AuthCard>
  );
}
