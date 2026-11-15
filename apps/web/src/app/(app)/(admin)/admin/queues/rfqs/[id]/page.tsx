import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { matchSuppliers, MAX_RFQ_SUPPLIERS, moderationDetail } from "@h2india/core/rfq";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { showSample } from "@/cms/sample";
import { AssignButton, RfqDecision } from "../Decision";

// Moderation · RFQ (632:1138), step 9.4: what the buyer sent, the seriousness checklist, the decision and the audit
// trail. Approving sends RFQ received to every chosen supplier; Request changes sends RFQ returned to the buyer.
export const metadata: Metadata = { title: "RFQ moderation · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RfqModerationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("queues.view", `/admin/queues/rfqs/${id}`);
  const d = await moderationDetail(getDb(), actor, id);
  if (!d) notFound();
  const item = d.items[0];
  const failed = d.checks.filter((c) => !c.ok).length;
  const open = d.rfq.status === "In moderation";
  // "Let H2 India suggest suppliers" (A164): verified suppliers that fit, for the moderator to add.
  const chosen = new Set(d.suppliers.map((s) => s.organisationId));
  const candidates =
    open && d.rfq.suggestSuppliers
      ? (
          await matchSuppliers(getDb(), { categoryId: d.rfq.categoryId, includeSample: showSample(), limit: 12 })
        ).filter((m) => !chosen.has(m.organisationId))
      : [];
  const rows: [string, string][] = [
    [
      "Item",
      item
        ? `${item.description} × ${String(item.quantity)}${item.unit === "units" ? "" : ` ${item.unit}`}`
        : d.rfq.title,
    ],
    ["Category", d.category ?? "Not given"],
    [
      "Specification",
      item && Object.keys(item.specs).length
        ? Object.entries(item.specs)
            .map(([k, v]) => `${k} ${String(v)}`)
            .join(" · ")
        : "Not given",
    ],
    ["Delivery site", d.site ?? "Not given"],
    ["Needed by", d.rfq.requiredBy ? formatIstDate(d.rfq.requiredBy) : "Not given"],
    ["Offer deadline", d.rfq.offerDeadline ? formatIstDateTime(d.rfq.offerDeadline) : "Not given"],
    ["Note", d.rfq.requirements ?? "—"],
    [
      "Suppliers",
      [
        d.suppliers.map((s) => s.name).join(" · "),
        d.rfq.suggestSuppliers ? "The buyer asked H2 India to suggest suppliers" : "",
      ]
        .filter(Boolean)
        .join(" · ") || "None chosen",
    ],
    ["Contact", d.email],
  ];
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <Link href="/admin/queues/rfqs" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Queues · RFQs
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="type-h2">
            {d.rfq.reference} · {d.rfq.title}
          </h1>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            <StatusBadge
              status={open ? (d.moderator ? "In review" : "Waiting") : d.rfq.status}
              tone={open ? "progress" : "neutral"}
            />
            Submitted by {d.submitter} · {d.company}
            {d.rfq.submittedAt ? ` · ${formatIstDateTime(d.rfq.submittedAt)}` : ""}
          </p>
        </div>
        {open && can(actor, "queues.edit") ? (
          <span className="flex items-center gap-2 type-body-sm">
            {d.moderator ? `Assigned to ${d.moderator}` : "Unassigned"}
            <AssignButton
              id={d.rfq.id}
              toMe={d.rfq.moderatorId !== userId}
              label={d.rfq.moderatorId === userId ? "Unassign" : d.moderator ? "Reassign to me" : "Assign to me"}
            />
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">What the buyer sent</h2>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="type-body-sm text-secondary">{k}</dt>
                  <dd className="type-body-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <div className="flex items-center justify-between">
              <h2 className="type-h4">Seriousness checklist</h2>
              <StatusBadge
                status={`${String(d.checks.length - failed)} of ${String(d.checks.length)}`}
                tone={failed ? "warning" : "success"}
              />
            </div>
            <ul className="flex flex-col gap-3">
              {d.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  <Icon
                    name={c.ok ? "check-circle" : "alert-circle"}
                    size={18}
                    className={c.ok ? "text-icon-primary" : "text-icon-error"}
                  />
                  <span>
                    <span className="block type-label">{c.label}</span>
                    {c.detail ? <span className="block type-caption text-error">{c.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Decision</h2>
            {open && can(actor, "queues.edit") ? (
              <RfqDecision
                id={d.rfq.id}
                buyer={d.submitter.split(/\s+/)[0] ?? d.submitter}
                next={d.next}
                suggest={
                  d.rfq.suggestSuppliers
                    ? {
                        slots: Math.max(0, MAX_RFQ_SUPPLIERS - chosen.size),
                        chosen: chosen.size,
                        candidates: candidates.map((m) => ({
                          id: m.organisationId,
                          name: m.name,
                          detail: [m.place, ...m.reasons].filter(Boolean).join(" · "),
                        })),
                      }
                    : null
                }
              />
            ) : (
              <p className="type-body-sm text-body">
                {d.decisions[0]
                  ? `${d.decisions[0].decision} on ${formatIstDateTime(d.decisions[0].at)}.`
                  : `This RFQ is ${d.rfq.status}.`}
              </p>
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Audit trail</h2>
            <ol className="flex flex-col gap-3">
              {d.trail.map((t) => (
                <li key={`${t.at.toISOString()}${t.to}`}>
                  <p className="type-mono text-secondary">{formatIstDateTime(t.at)} IST</p>
                  <p className="type-body-sm">
                    {t.actor ?? "System"}: {t.to}
                    {t.reason ? ` · ${t.reason}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
