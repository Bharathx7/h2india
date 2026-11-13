import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { grievanceDetail } from "@h2india/core/compliance";
import { GRIEVANCE_TRANSITIONS, type GrievanceStatus } from "@h2india/core/grievances/rules";
import { formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MoveGrievance } from "@/admin/compliance/Controls";
import { AdminShell, requireOperator } from "@/admin/shell";

// Grievance detail (661:325), step 11.7: what was raised, the deadlines and the status history; acknowledge, review
// and resolve with a note the person sees when they look up the ticket.
export const metadata: Metadata = { title: "Grievance · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GrievancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("compliance.view", `/admin/compliance/grievances/${id}`);
  const d = await grievanceDetail(getDb(), actor, id);
  if (!d) notFound();
  const g = d.grievance;
  return (
    <AdminShell userId={userId} current="/admin/compliance" title="Compliance">
      <Link href="/admin/compliance" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Compliance · Grievances
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-3 type-h2">
          {g.reference}
          <StatusBadge status={g.status} tone={g.status === "Resolved" ? "success" : "progress"} />
        </h1>
        <p className="type-body-sm text-secondary">
          {g.type} · received {formatIstDateTime(g.createdAt)} · resolve by {formatIstDateTime(g.resolveBy)}
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">What was raised</h2>
            <dl className="grid gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
              {(
                [
                  ["From", [g.name, g.email, g.mobile].filter(Boolean).join(" · ")],
                  ["Page", g.pageUrl],
                  ["Complaint", g.description],
                  ["Team", g.team ?? ""],
                  ["Outcome", g.outcome ?? ""],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="type-body-sm text-secondary">{k}</dt>
                    <dd className="type-body-sm whitespace-pre-wrap">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">History</h2>
            <ol className="flex flex-col gap-2">
              {d.history.map((h) => (
                <li key={h.id} className="type-body-sm">
                  <span className="type-mono text-secondary">{formatIstDateTime(h.at)}</span> · {h.toStatus}
                  {h.reason ? ` · ${h.reason}` : ""}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Next step</h2>
          {can(actor, "compliance.edit") ? (
            <MoveGrievance id={g.id} next={[...GRIEVANCE_TRANSITIONS[g.status as GrievanceStatus]]} />
          ) : (
            <p className="type-body-sm text-secondary">Only the grievance officer and deputy can move this.</p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
