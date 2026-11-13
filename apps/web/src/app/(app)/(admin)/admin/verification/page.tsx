import { getDb } from "@h2india/core";
import { can, loadActor } from "@h2india/core/authz";
import { pendingClaims } from "@h2india/core/companies";
import { formatIstDateTime } from "@h2india/core/companies/client";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";
import { toRows } from "../../../(workspace)/notifications/rows";
import { ClaimDecision } from "./ClaimDecision";

// Verification desk · profile claims (step 6.7; not drawn, A11 — the Suppliers queue arrives with 11.2). Operators with
// verification.view see the evidence; verification.edit decides. Every claim needs an operator (A137).
export const metadata: Metadata = { title: "Verification · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/admin/verification");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  if (!can(actor, "verification.view")) notFound();
  const [shell, unread, bell, claims] = await Promise.all([
    shellFor(session.user.id),
    unreadCount(db, session.user.id),
    listNotifications(db, session.user.id, { limit: 5 }),
    pendingClaims(db, actor),
  ]);
  const canDecide = can(actor, "verification.edit");
  return (
    <WorkspaceFrame
      area="admin"
      groups={WORKSPACE_NAV.admin}
      current="/admin/verification"
      user={shell.user}
      welcome="Verification"
      home="/admin"
      bell={{ unread, items: toRows(bell) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <h1 className="type-h2">Profile claims</h1>
        <p className="type-body text-secondary">
          People claiming pre-seeded company profiles. Check the evidence, then approve or reject with a reason.
        </p>
        {claims.length === 0 ? (
          <div className="rounded-card border border-default">
            <EmptyState title="No claims waiting">New claims show here as people send them.</EmptyState>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
            {claims.map((r) => (
              <li key={r.claim.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-1">
                  <Link href={`/directory/companies/${r.slug}`} className="type-label-lg text-link hover:underline">
                    {r.company}
                  </Link>
                  <p className="type-body-sm text-body">
                    {r.claimant || "Unnamed"} · {r.claimantEmail}
                  </p>
                  <p className="type-caption text-secondary">Sent {formatIstDateTime(r.claim.createdAt)}</p>
                  {r.claim.method === "email" ? (
                    <StatusBadge status={`Company email verified: ${r.claim.email ?? ""}`} tone="success" />
                  ) : (
                    <p className="type-body-sm text-body">
                      GSTIN {r.claim.gstin} ·{" "}
                      {r.claim.letterFileId ? (
                        <a
                          href={`/api/v1/files/${r.claim.letterFileId}/link`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link underline"
                        >
                          Open the authorisation letter
                        </a>
                      ) : (
                        "no letter"
                      )}
                    </p>
                  )}
                </div>
                {canDecide ? (
                  <ClaimDecision claimId={r.claim.id} company={r.company} />
                ) : (
                  <p className="type-caption text-secondary">You can see claims but not decide them.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorkspaceFrame>
  );
}
