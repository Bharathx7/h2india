import { recoveryForReview } from "@h2india/core/recovery";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { AuthCard } from "../../../AuthCard";
import { StatusIcon } from "../../../StatusIcon";
import { DecideButtons } from "./DecideButtons";

// Approve a recovery (step 3.5). Not drawn (decision A11): built from the auth card and the Join request screens.
// The server checks who may answer (an Admin of that company, or support for A17); this page only shows it.
export const metadata: Metadata = { title: "Review a request · H2 India", robots: { index: false } };

export default async function RecoveryReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=/account/recovery/${id}`);
  const row = await recoveryForReview(id).catch(() => null);
  if (!row) notFound();
  const person = row.name || row.email || "A team member";
  const mobile = row.r.kind === "mobile";
  const open = row.r.status === "Waiting for admin" || row.r.status === "Waiting for support";
  return (
    <AuthCard>
      <StatusIcon name="shield-check" />
      <h1 className="type-h2 text-primary">{mobile ? "Approve a new mobile number" : "Confirm a team member"}</h1>
      <p className="type-body text-body">
        {mobile
          ? `${person} changed their mobile number to ${row.r.newMobile ?? ""}. It takes effect when you approve it.`
          : `${person} lost access to their work email (${row.email ?? ""}) and verified their mobile. Confirm it's them so they can add a new work email.`}
      </p>
      {row.company ? <p className="type-body-sm text-secondary">Company: {row.company}</p> : null}
      {open ? (
        <DecideButtons requestId={id} />
      ) : (
        <p className="type-body text-body" role="status">
          This request is {row.r.status.toLowerCase()}.
        </p>
      )}
    </AuthCard>
  );
}
