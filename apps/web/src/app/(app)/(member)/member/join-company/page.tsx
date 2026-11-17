import { latestJoinRequest, shortCompanyName } from "@h2india/core/companies";
import { formatIstDate } from "@h2india/core/companies/client";
import { Alert, buttonClasses, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { FindCompany, PendingActions } from "@/member/JoinCompany";
import { MemberShell, requireMember } from "@/member/shell";
import { shellFor } from "@/server/workspace";

// Join a company (founder QC, 17 Nov 2026): the member menu's item led nowhere. A member finds their company and asks
// its admin to let them in (the Join request flow, 365:27779, inside the member workspace). Once approved, they work
// in the company's buyer or supplier workspace. No Figma frame; built from the workspace panels.

export const metadata: Metadata = { title: "Join a company · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinCompanyPage() {
  const userId = await requireMember("/member/join-company");
  const request = await latestJoinRequest(userId);
  const company = request ? shortCompanyName(request.organisationName) : "";
  const pending = request?.status === "Pending";
  const approved = request?.status === "Approved";
  // Once approved, the person's workspace is the company's (identityOf: the first company seat decides).
  const home = approved ? (await shellFor(userId)).home : "/member";

  return (
    <MemberShell userId={userId} current="/member/join-company">
      <div>
        <h1 className="type-h2">Join a company</h1>
        <p className="type-body-sm text-secondary">
          Work for a buyer or supplier on H2 Economy? Ask to join your company. Its admin approves the request, then you
          can request quotes, quote or manage listings with your team.
        </p>
      </div>

      {request ? (
        <section
          aria-labelledby="request"
          className="flex max-w-3xl flex-col gap-4 rounded-card border border-default bg-page p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="request" className="type-h4">
              Your request to join {company}
            </h2>
            <StatusBadge
              status={request.status}
              tone={approved ? "success" : pending ? "progress" : request.status === "Rejected" ? "error" : "neutral"}
            />
          </div>
          {pending ? (
            <>
              <p className="type-body-sm text-body">
                Sent {formatIstDate(request.requestedAt)}. {request.admin?.name || "The company admin"} has until{" "}
                {formatIstDate(request.expiresAt)} to answer; we&apos;ll email you either way.
              </p>
              <PendingActions requestId={request.id} remindedToday={request.remindedToday} />
            </>
          ) : approved ? (
            <>
              <p className="type-body-sm text-body">
                {request.decidedByName || "The admin"} approved your request. You&apos;re part of {company}.
              </p>
              <div>
                <Link href={home} className={buttonClasses({})}>
                  Go to your company workspace
                  <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </>
          ) : request.status === "Rejected" ? (
            request.reason ? (
              <Alert tone="info" title="Reason from the admin">
                &ldquo;{request.reason}&rdquo;
              </Alert>
            ) : (
              <p className="type-body-sm text-body">The admin didn&apos;t approve this request.</p>
            )
          ) : (
            <p className="type-body-sm text-body">This request expired without an answer. You can ask again.</p>
          )}
        </section>
      ) : null}

      {pending || approved ? null : (
        <section
          aria-labelledby="find"
          className="flex max-w-3xl flex-col gap-4 rounded-card border border-default bg-page p-5"
        >
          <h2 id="find" className="type-h4">
            Find your company
          </h2>
          <FindCompany />
        </section>
      )}
    </MemberShell>
  );
}
