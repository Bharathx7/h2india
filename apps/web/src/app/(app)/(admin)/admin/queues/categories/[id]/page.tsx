import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { catalogueTree, categoryRequestDetail } from "@h2india/core/catalogue/taxonomy";
import { formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryDecision } from "@/admin/queues/CategoryDecision";
import { AdminShell, requireOperator } from "@/admin/shell";

// Category request (supplier QC, 16 Nov 2026). No Figma frame: built like the moderation pages (633:8). Shows what the
// supplier asked for and where; the operator approves (adds the category) or rejects with a reason.
export const metadata: Metadata = { title: "Category request · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CategoryRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { userId, actor } = await requireOperator("queues.view", `/admin/queues/categories/${id}`);
  const db = getDb();
  const d = await categoryRequestDetail(db, actor, id);
  if (!d) notFound();
  const tree = can(actor, "catalogue.view") ? await catalogueTree(db, actor) : [];
  const classes = tree.map((c) => ({
    id: c.id,
    label: c.label,
    categories: c.categories.map((k) => ({ id: k.id, label: k.label })),
  }));
  const open = d.status === "Pending";
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <Link href="/admin/queues/categories" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Queues · Category requests
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">{d.label}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge
            status={open ? "Waiting" : d.status}
            tone={open ? "progress" : d.status === "Approved" ? "success" : "neutral"}
          />
          {d.company} · asked by {d.requester ?? "a team member"} · {formatIstDateTime(d.createdAt)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="asked" className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
          <h2 id="asked" className="type-h4">
            What they asked for
          </h2>
          <dl className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="type-caption text-secondary">Where</dt>
              <dd className="type-body">{[d.classLabel, d.parentLabel].filter(Boolean).join(" › ")}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="type-caption text-secondary">What products it is for</dt>
              <dd className="type-body whitespace-pre-line">{d.description}</dd>
            </div>
            {d.example ? (
              <div className="flex flex-col gap-0.5">
                <dt className="type-caption text-secondary">Example product</dt>
                <dd className="type-body">{d.example}</dd>
              </div>
            ) : null}
            {d.reason ? (
              <div className="flex flex-col gap-0.5">
                <dt className="type-caption text-secondary">Reason given</dt>
                <dd className="type-body">{d.reason}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        {open && can(actor, "queues.edit") ? (
          <CategoryDecision
            id={d.id}
            classes={classes}
            start={{ classId: d.classId, parentId: d.parentId ?? "", label: d.label }}
            canApprove={can(actor, "catalogue.edit")}
          />
        ) : (
          <p className="type-body-sm text-secondary">
            {open ? "You can view this request but not decide it." : `This request was ${d.status.toLowerCase()}.`}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
