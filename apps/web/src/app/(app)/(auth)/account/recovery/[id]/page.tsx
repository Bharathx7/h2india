import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { formatIstDateTime } from "@h2india/core/companies/client";
import { canHandleSupport, recoveryForReview } from "@h2india/core/recovery";
import { Button } from "@h2india/ui";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { AuthCard } from "../../../AuthCard";
import { StatusIcon } from "../../../StatusIcon";
import { CloseSupportButton, DecideButtons } from "./DecideButtons";

// Review a recovery request (steps 3.5 and 3.7). Not drawn (decision A11): built from the auth card and the Join
// request screens. Only an Admin of the company or operators with Users access see it; the server checks every answer.
export const metadata: Metadata = { title: "Review a request · H2 India", robots: { index: false } };

export default async function RecoveryReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=/account/recovery/${id}`);
  const actor = await loadActor(getDb(), session.user.id);
  const row = await recoveryForReview(actor, id);
  if (!row) notFound();

  if (row.r.kind === "support") {
    const open = row.r.status === "Waiting for support";
    return (
      <AuthCard>
        <p className="type-caption text-secondary">Support request · {row.r.reference}</p>
        <StatusIcon name="shield-check" />
        <h1 className="type-h2 text-primary">Lost email: check their ID</h1>
        <p className="type-body text-body">
          Check the work ID with the company before you change anything. Reply within 2 working days.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 type-body-sm">
          <dt className="text-secondary">Name</dt>
          <dd className="text-primary">{row.r.contactName}</dd>
          <dt className="text-secondary">Company</dt>
          <dd className="text-primary">{row.r.contactCompany}</dd>
          <dt className="text-secondary">Reply to</dt>
          <dd className="text-primary break-all">{row.r.contactEmail}</dd>
          <dt className="text-secondary">Sent</dt>
          <dd className="text-primary">{formatIstDateTime(row.r.createdAt)}</dd>
        </dl>
        {row.r.documentFileId ? (
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={`/api/v1/files/${row.r.documentFileId}/link`} target="_blank" rel="noopener noreferrer">
              Open work ID
            </a>
          </Button>
        ) : null}
        {open && canHandleSupport(actor) ? (
          <CloseSupportButton requestId={id} />
        ) : (
          <p className="type-body text-body" role="status">
            {open
              ? "Waiting for H2 India support."
              : "This request is closed. The work ID is deleted 30 days after closing."}
          </p>
        )}
      </AuthCard>
    );
  }

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
