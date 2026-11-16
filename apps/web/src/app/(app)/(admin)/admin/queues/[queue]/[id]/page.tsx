import { can } from "@h2india/core/authz";
import { getDb } from "@h2india/core";
import { fieldComments, QUEUES } from "@h2india/core/queues";
import { formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { itemDetail, queueItems } from "@/admin/queues/data";
import { Claim, FieldComment, Moderate } from "@/admin/queues/Moderate";
import { AdminShell, requireOperator } from "@/admin/shell";

// Moderation · Content (633:8), Event (633:567) and Job (633:1059), step 11.2: what was sent, the checks, the decision
// and who has it. Suppliers are decided on the Verification desk; listings and RFQs on their own screens.
export const metadata: Metadata = { title: "Moderation · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const AFTER: Record<string, { approve: string; after: string; heading: string }> = {
  content: {
    approve: "Approve",
    after: "Approving marks it ready; an editor publishes the article in the CMS.",
    heading: "What they sent",
  },
  events: {
    approve: "Approve and publish",
    after: "The event isn't listed until it's approved.",
    heading: "Event details",
  },
  jobs: { approve: "Approve and publish", after: "The job goes live on Jobs straight away.", heading: "Job details" },
};

export default async function ModerationPage({ params }: { params: Promise<{ queue: string; id: string }> }) {
  const { queue: key, id } = await params;
  const queue = QUEUES.find((q) => q.key === key);
  const words = AFTER[key];
  if (!queue || !words) notFound();
  const { userId, actor } = await requireOperator("queues.view", `/admin/queues/${key}/${id}`);
  const d = await itemDetail(actor, queue.key, id);
  if (!d) notFound();
  const [all, comments] = await Promise.all([queueItems(actor, queue.key), fieldComments(getDb(), queue.key, id)]);
  const mine = all.find((x) => x.id === id);
  const next = all.find((x) => x.id !== id)?.id ?? null;
  const failed = d.checks.filter((c) => !c.ok).length;
  const open = Boolean(mine);
  const canEdit = can(actor, "queues.edit");
  const person = d.submitter?.name.split(/\s+/)[0] ?? "the sender";
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <Link href={`/admin/queues/${key}`} className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Queues · {queue.label}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="type-h2">{d.title}</h1>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            <StatusBadge
              status={open ? (mine?.claimer ? "In review" : "Waiting") : d.status}
              tone={open ? "progress" : "neutral"}
            />
            {[
              d.reference,
              d.organisation,
              d.submitter ? `submitted by ${d.submitter.name}` : null,
              d.submittedAt ? formatIstDateTime(d.submittedAt) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {open && can(actor, "queues.edit") ? (
          <span className="flex items-center gap-2 type-body-sm">
            {mine?.claimer ? `Assigned to ${mine.claimer}` : "Unassigned"}
            <Claim
              queue={queue.key}
              id={id}
              toMe={mine?.claimedBy !== userId}
              label={mine?.claimedBy === userId ? "Unassign" : mine?.claimer ? "Reassign to me" : "Assign to me"}
            />
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">{words.heading}</h2>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
              {d.rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="type-body-sm text-secondary">{k}</dt>
                    <dd className="flex flex-col gap-2">
                      <span className="type-body-sm whitespace-pre-wrap">{v}</span>
                      {comments
                        .filter((c) => c.field === k)
                        .map((c) => (
                          <span key={c.id} className="flex items-start gap-2 rounded-input bg-warning p-2 type-caption">
                            <Icon name="message-square" size={14} className="mt-0.5" />
                            <span>
                              <span className="type-label">{c.author}:</span> {c.note}
                              <span className="text-secondary"> · {formatIstDateTime(c.at)}</span>
                            </span>
                          </span>
                        ))}
                      {open && canEdit ? <FieldComment queue={queue.key} id={id} field={k} /> : null}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <div className="flex items-center justify-between">
              <h2 className="type-h4">Checks</h2>
              <StatusBadge
                status={failed ? `${String(failed)} to fix` : "All passed"}
                tone={failed ? "warning" : "success"}
              />
            </div>
            <ul className="flex flex-col gap-3">
              {d.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  <Icon
                    name={c.ok ? "check-circle" : "alert-circle"}
                    size={18}
                    className={c.ok ? "text-icon-primary" : "text-icon-error"}
                  />
                  <span>
                    <span className="block type-label">{c.label}</span>
                    {c.detail ? (
                      <span className={c.ok ? "block type-caption text-secondary" : "block type-caption text-error"}>
                        {c.detail}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Decision</h2>
          {open && can(actor, "queues.edit") ? (
            <Moderate
              queue={queue.key}
              id={id}
              person={person}
              approveLabel={words.approve}
              after={words.after}
              next={next}
            />
          ) : (
            <p className="type-body-sm text-body">This item is {d.status}.</p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
