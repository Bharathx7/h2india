import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { requestDetail, type PlanLine } from "@h2india/core/compliance";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRightsActions } from "@/admin/compliance/Controls";
import { AdminShell, requireOperator } from "@/admin/shell";

// A data-rights request (660:1786), step 11.7: access, correction or erasure. Erasure shows the dry run (every table
// and file, and whether it is deleted, masked or kept) before it can run.
export const metadata: Metadata = { title: "Data-rights request · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const ACTION: Record<PlanLine["action"], { label: string; tone: "error" | "warning" | "neutral" }> = {
  delete: { label: "Delete", tone: "error" },
  mask: { label: "Mask", tone: "warning" },
  keep: { label: "Keep", tone: "neutral" },
};

export default async function DataRightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("compliance.view", `/admin/compliance/data-rights/${id}`);
  const x = await requestDetail(getDb(), actor, id);
  if (!x) notFound();
  const plan = x.plan as { lines: PlanLine[]; blockers: string[]; at: string } | null;
  const open = x.status !== "Completed" && x.status !== "Rejected";
  return (
    <AdminShell userId={userId} current="/admin/compliance" title="Compliance">
      <Link href="/admin/compliance?tab=data-rights" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Compliance · Data rights
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-3 type-h2">
          {x.reference}
          <StatusBadge status={x.status} tone={x.status === "Completed" ? "success" : open ? "progress" : "neutral"} />
        </h1>
        <p className="type-body-sm text-secondary">
          {x.kind === "access"
            ? "A copy of their data"
            : x.kind === "correct"
              ? "Correct their data"
              : "Erase their data"}{" "}
          · {x.email} · received {formatIstDate(x.createdAt)} · due {formatIstDate(x.dueAt)}
        </p>
      </div>
      {x.details ? (
        <Alert tone="info" title="What they asked">
          {x.details}
        </Alert>
      ) : null}
      {x.resolution ? (
        <Alert tone={x.status === "Completed" ? "success" : "info"} title={x.status}>
          {x.resolution}
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">{x.kind === "erase" ? "Dry run" : "About this request"}</h2>
          {x.kind !== "erase" ? (
            <p className="type-body-sm text-body">
              Check the person is who they say they are before you send or change anything.
            </p>
          ) : plan ? (
            <>
              <p className="type-caption text-secondary">
                Run {formatIstDateTime(new Date(plan.at))}. Erasure follows this list exactly and must run within an
                hour of it.
              </p>
              {plan.blockers.map((b) => (
                <Alert key={b} tone="error" title={b} />
              ))}
              <div tabIndex={0} role="region" aria-label="Erasure plan" className="relative overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="bg-subtle text-left type-caption text-secondary">
                      <th scope="col" className="px-3 py-2">
                        Where
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Rows
                      </th>
                      <th scope="col" className="px-3 py-2">
                        What happens
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Why
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.lines.map((l) => (
                      <tr key={l.table} className="border-t border-default">
                        <td className="px-3 py-2 type-mono">{l.table}</td>
                        <td className="px-3 py-2 type-body-sm">{l.rows}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={ACTION[l.action].label} tone={ACTION[l.action].tone} />
                        </td>
                        <td className="px-3 py-2 type-caption text-secondary">{l.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="type-body-sm text-body">
              Run the dry run to see every table and file erasure would touch. Nothing changes until you erase.
            </p>
          )}
        </section>
        <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Actions</h2>
          {can(actor, "compliance.edit") ? (
            <DataRightsActions
              id={x.id}
              kind={x.kind}
              open={open}
              hasPlan={Boolean(plan)}
              blockers={plan?.blockers.length ?? 0}
            />
          ) : (
            <p className="type-body-sm text-secondary">Only operators with Compliance edit can act on this.</p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
