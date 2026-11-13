import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { revisionDetail } from "@h2india/core/products";
import { formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { catalogue } from "@/marketplace/data";
import { Decision } from "./Decision";

// Moderation · Listing (632:695), step 8.3: what changed (live now and submitted), the automated checks, the decision
// and the audit trail. Approving a change applies it to the live listing at once.
export const metadata: Metadata = { title: "Listing review · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ModerationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("queues.view", `/admin/queues/listings/${id}`);
  const [d, cat] = await Promise.all([revisionDetail(getDb(), actor, id), catalogue()]);
  if (!d) notFound();
  const categoryLabel = (cid: string) => {
    for (const c of cat.classes)
      for (const k of c.categories) {
        if (k.id === cid) return `${c.label} › ${k.label}`;
        const s = k.children.find((x) => x.id === cid);
        if (s) return `${c.label} › ${k.label} › ${s.label}`;
      }
    return cid;
  };
  const rows = d.rows.map((r) =>
    r.field === "categoryId" ? { ...r, live: categoryLabel(r.live), submitted: categoryLabel(r.submitted) } : r,
  );
  const changed = rows.filter((r) => r.changed).length;
  const fields = [
    { key: "name", label: "Product name", section: "details" as const },
    { key: "categoryId", label: "Category", section: "category" as const },
    ...d.defs.map((x) => ({ key: x.key, label: x.label, section: "specifications" as const })),
    ...d.defs
      .filter((x) => x.testCondition)
      .map((x) => ({ key: `note:${x.key}`, label: `${x.label}: test conditions`, section: "specifications" as const })),
    { key: "documents", label: "Documents and certificates", section: "documents" as const },
    { key: "commercial", label: "Commercial terms", section: "commercial" as const },
  ];
  const decided = d.revision.status !== "In review";
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <Link href="/admin/queues/listings" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Queues · Listings
      </Link>
      <div>
        <h1 className="type-h2">{d.product.name}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge status={d.revision.status} tone={decided ? "neutral" : "progress"} />
          {[
            d.product.model,
            d.revision.kind,
            d.revision.submittedAt ? `submitted ${formatIstDateTime(d.revision.submittedAt)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <div className="flex items-center justify-between">
              <h2 className="type-h4">{d.isNew ? "New listing" : "Spec changes"}</h2>
              {!d.isNew ? (
                <StatusBadge
                  status={`${String(changed)} ${changed === 1 ? "field" : "fields"} changed`}
                  tone="neutral"
                />
              ) : null}
            </div>
            <div tabIndex={0} role="region" aria-label="Fields" className="relative overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="bg-subtle text-left type-caption text-secondary">
                    <th scope="col" className="px-3 py-2">
                      Field
                    </th>
                    {!d.isNew ? (
                      <th scope="col" className="px-3 py-2">
                        Live now
                      </th>
                    ) : null}
                    <th scope="col" className="px-3 py-2">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.field} className={r.changed ? "bg-mint" : "border-t border-default"}>
                      <th scope="row" className="px-3 py-2.5 text-left type-body-sm font-normal text-secondary">
                        {r.label}
                      </th>
                      {!d.isNew ? <td className="px-3 py-2.5 type-body-sm">{r.live}</td> : null}
                      <td className={r.changed ? "px-3 py-2.5 type-label" : "px-3 py-2.5 type-body-sm"}>
                        {r.submitted}
                        {r.changed ? " · changed" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <div className="flex items-center justify-between">
              <h2 className="type-h4">Automated checks</h2>
              {d.revision.checks.every((c) => c.ok) ? <StatusBadge status="All passed" tone="success" /> : null}
            </div>
            <ul className="flex flex-col gap-2">
              {d.revision.checks.map((c) => (
                <li key={c.key} className="flex gap-2">
                  <Icon name={c.ok ? "check-circle" : "alert-circle"} size={18} className={c.ok ? "" : "text-error"} />
                  <span>
                    <span className="block type-label">{c.label}</span>
                    {c.detail ? <span className="block type-caption text-secondary">{c.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          {!decided && can(actor, "queues.edit") ? (
            <Decision id={d.revision.id} fields={fields} live={!d.isNew} />
          ) : (
            <section className="rounded-card border border-default bg-page p-5 type-body-sm">
              {decided ? `Decided: ${d.revision.status}.` : "You can see this review but not decide it."}
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Audit trail</h2>
            <ul className="flex flex-col gap-3">
              {d.history.map((h, i) => (
                <li key={String(i)}>
                  <p className="type-spec text-secondary">{formatIstDateTime(h.at)} IST</p>
                  <p className="type-body-sm">
                    {h.actor ?? "System"} · {h.action.replace(/\./g, " ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
