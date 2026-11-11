import { latestJoinRequest, shortCompanyName } from "@h2india/core/companies";
import { formatIstDate, formatIstDateTime } from "@h2india/core/companies/client";
import { Alert, Button } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";
import { RequestActions } from "./RequestActions";

// Join request (Figma 365:27779): Pending (527:8, 390: 528:696), Rejected (527:56), Approved and Expired (527:112).
export const metadata: Metadata = { title: "Join request · H2 India", robots: { index: false } };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export default async function JoinRequestPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/join/request");
  const request = await latestJoinRequest(session.user.id);
  if (!request) redirect("/join");
  const company = shortCompanyName(request.organisationName);
  const admin = request.admin?.name || "The company admin";
  const decider = request.decidedByName || admin;

  if (request.status === "Approved") {
    return (
      <AuthCard>
        <StatusIcon name="check-circle" />
        <h1 className="type-h2 text-primary">You&apos;re in</h1>
        <p className="type-body text-body">
          {decider} approved your request. You&apos;re now part of {company}.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/join/done">Go to your workspace</Link>
        </Button>
      </AuthCard>
    );
  }

  if (request.status === "Rejected") {
    return (
      <AuthCard>
        <StatusIcon name="alert-circle" tone="error" />
        <h1 className="type-h2 text-primary">Your request wasn&apos;t approved</h1>
        <p className="type-body text-body">
          {decider} didn&apos;t approve your request to join {company}.
        </p>
        {request.reason ? (
          <Alert tone="info" title="Reason from the admin">
            &ldquo;{request.reason}&rdquo;
          </Alert>
        ) : null}
        <RequestActions
          kind="rejected"
          requestId={request.id}
          organisationId={request.organisationId}
          adminEmail={request.admin?.email ?? null}
        />
        <p className="type-caption text-secondary">
          Creating a separate company sets up a new account that your colleagues won&apos;t see.
        </p>
      </AuthCard>
    );
  }

  if (request.status === "Expired") {
    return (
      <AuthCard>
        <StatusIcon name="clock" />
        <h1 className="type-h2 text-primary">Your request expired</h1>
        <p className="type-body text-body">
          Requests expire after 14 days without an answer. Your earlier request to {company} was sent on{" "}
          {formatIstDate(request.requestedAt)}.
        </p>
        <RequestActions
          kind="expired"
          requestId={request.id}
          organisationId={request.organisationId}
          adminEmail={null}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <StatusIcon name="clock" />
      <h1 className="type-h2 text-primary">Waiting for approval</h1>
      <p className="type-body text-body">
        We&apos;ve asked {admin}, the admin at {company}, to approve you. We&apos;ll email you as soon as they do.
      </p>
      <div className="flex items-center gap-3 rounded-card bg-subtle p-4">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-card bg-page type-label text-primary"
        >
          {initials(company)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="type-label text-primary">{request.organisationName}</p>
          <p className="type-caption text-secondary">
            Requested by {session.user.email} · {formatIstDateTime(request.requestedAt)}
          </p>
        </div>
      </div>
      <RequestActions
        kind="pending"
        requestId={request.id}
        organisationId={request.organisationId}
        adminEmail={null}
        remindedToday={request.remindedToday}
      />
      <p className="type-caption text-secondary">
        You can send one reminder a day. Requests expire after 14 days, on {formatIstDate(request.expiresAt)}. You can
        browse H2 India and save items while you wait.
      </p>
    </AuthCard>
  );
}
