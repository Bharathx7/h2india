import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { grievanceClocks, grievanceDetail } from "@h2india/core/compliance";
import { GRIEVANCE_TRANSITIONS, type GrievanceStatus } from "@h2india/core/grievances/rules";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MoveGrievance } from "@/admin/compliance/Controls";
import { clockBadge } from "@/admin/compliance/views";
import { AdminShell, requireOperator } from "@/admin/shell";

// Grievance · GRV-2026-00318 (661:325), step 11.7: the complaint, its timeline, both clocks, status and assignee,
// the note the person sees and the outcome. Moves go through moveGrievance() (history and audit).
export const metadata: Metadata = { title: "Grievance · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** "+91 98•• ••• 114": enough to recognise the number, not to copy it. */
const maskMobile = (m: string) => {
  const d = m.replace(/\D/g, "");
  return d.length < 6 ? "•••" : `+91 ${d.slice(-10, -8)}•• ••• ${d.slice(-3)}`;
};

export default async function GrievancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("compliance.view", `/admin/compliance/grievances/${id}`);
  const db = getDb();
  const d = await grievanceDetail(db, actor, id);
  if (!d) notFound();
  const g = d.grievance;
  const clocks = (await grievanceClocks(db, actor, [g.id])).get(g.id) ?? [];
  const ack = clocks.find((c) => c.type === "grievanceAcknowledge") ?? null;
  const now = new Date();
  const first = g.name.split(/\s+/)[0] ?? g.name;
  const steps = [
    { label: "Received", at: g.createdAt, done: true, note: "ticket number emailed" },
    {
      label: "Acknowledge",
      at: g.acknowledgedAt ?? ack?.dueAt ?? null,
      done: Boolean(g.acknowledgedAt),
      note: g.acknowledgedAt ? "acknowledged" : "not yet",
    },
    {
      label: `Resolve and tell ${first} the outcome`,
      at: g.resolvedAt ?? g.resolveBy,
      done: Boolean(g.resolvedAt),
      note: g.resolvedAt ? (g.outcome ?? "resolved") : null,
    },
  ];
  return (
    <AdminShell userId={userId} current="/admin/compliance" title="Compliance">
      <Link href="/admin/compliance" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Grievances
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">{g.reference}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge status={g.status} tone={g.status === "Resolved" ? "success" : "neutral"} />
          <StatusBadge status={g.type} tone="neutral" />
          Raised {formatIstDateTime(g.createdAt)} IST through the grievance form
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Complaint</h2>
            <dl className="flex flex-col divide-y divide-default border-t border-default">
              {(
                [
                  ["Type", g.type],
                  ["Page or listing", g.pageUrl ?? ""],
                  ["What happened", g.description],
                  ["Attachments", g.files.length ? `${String(g.files.length)} files` : ""],
                  ["Raised by", [g.name, g.email, g.mobile ? maskMobile(g.mobile) : null].filter(Boolean).join(" · ")],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
                    <dt className="type-caption text-secondary">{k}</dt>
                    <dd className="type-body-sm whitespace-pre-wrap">
                      {k === "Page or listing" && /^https?:\/\//.test(v) ? (
                        <a href={v} className="text-link underline" target="_blank" rel="noreferrer">
                          {v}
                        </a>
                      ) : k === "Attachments" ? (
                        <span className="flex flex-col gap-2">
                          {g.files.map((f, i) => (
                            <a
                              key={f}
                              href={`/api/v1/files/${f}/link`}
                              className="flex items-center gap-2 rounded-input border border-default p-3 type-label"
                            >
                              <Icon name="file-text" size={16} />
                              Attachment {i + 1}
                              <Icon name="download" size={14} className="ml-auto" />
                            </a>
                          ))}
                        </span>
                      ) : (
                        v
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Timeline</h2>
            <ol className="flex flex-col divide-y divide-default border-t border-default">
              {steps.map((s) => (
                <li key={s.label} className="flex items-start gap-3 py-3">
                  <Icon name={s.done ? "check-circle" : "clock"} size={18} className="mt-0.5 text-icon-primary" />
                  <span>
                    <span className={s.done ? "block type-label" : "block type-label text-secondary"}>{s.label}</span>
                    <span className="block type-caption text-secondary">
                      {s.at ? `${s.done ? "" : "By "}${formatIstDateTime(s.at)}` : ""}
                      {s.note ? ` · ${s.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {d.history.length > 1 ? (
              <details>
                <summary className="cursor-pointer type-caption text-secondary">Status history</summary>
                <ol className="flex flex-col gap-1 pt-2">
                  {d.history.map((h) => (
                    <li key={h.id} className="type-caption">
                      {formatIstDateTime(h.at)} · {h.toStatus}
                      {h.reason ? ` · ${h.reason}` : ""}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col divide-y divide-default rounded-card border border-default bg-page px-5">
            {(
              [
                ["Acknowledge", ack?.dueAt ?? null, g.acknowledgedAt],
                ["Resolve", g.resolveBy, g.resolvedAt],
              ] as [string, Date | null, Date | null][]
            ).map(([label, due, done]) => {
              const b = clockBadge(due, done, now);
              return (
                <div key={label} className="flex items-center justify-between gap-3 py-4">
                  <span>
                    <span className="block type-label">{label}</span>
                    <span className="block type-caption text-secondary">
                      {due ? `by ${label === "Resolve" ? formatIstDate(due) : formatIstDateTime(due)}` : ""}
                    </span>
                  </span>
                  <StatusBadge status={b.text} tone={b.tone} />
                </div>
              );
            })}
          </section>
          <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
            {can(actor, "compliance.edit") ? (
              <MoveGrievance
                id={g.id}
                next={[...GRIEVANCE_TRANSITIONS[g.status as GrievanceStatus]]}
                person={first}
                team={g.team ?? ""}
              />
            ) : (
              <p className="type-body-sm text-secondary">Only the grievance officer and deputy can move this.</p>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
