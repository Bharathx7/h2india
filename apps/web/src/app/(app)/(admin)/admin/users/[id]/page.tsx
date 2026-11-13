import { getDb } from "@h2india/core";
import { userDetail } from "@h2india/core/admin/users";
import { can } from "@h2india/core/authz";
import { formatIstDateTime } from "@h2india/core/time";
import { Alert, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { SuspendCompany, SuspendUser, ViewAs } from "@/admin/users/Controls";

// User detail (651:1042), step 11.4: who they are, their companies and roles, devices, recent activity, and the
// actions Suspend user (653:568) and View as user (657:328).
export const metadata: Metadata = { title: "User · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("users.view", `/admin/users/${id}`);
  const d = await userDetail(getDb(), actor, id);
  if (!d) notFound();
  const p = d.person;
  const canEdit = can(actor, "users.edit");
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <Link href="/admin/users" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Users
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-3 type-h2">
            {p.name || p.email}
            <StatusBadge status={p.suspendedAt ? "Suspended" : "Active"} tone={p.suspendedAt ? "error" : "success"} />
          </h1>
          <p className="type-body-sm text-secondary">
            {p.email}
            {p.mobile ? ` · ${p.mobile}` : ""} · joined {formatIstDateTime(p.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.id !== userId ? <ViewAs userId={p.id} name={p.name || p.email} /> : null}
          {canEdit && p.id !== userId ? (
            <SuspendUser userId={p.id} name={p.name || p.email} suspended={Boolean(p.suspendedAt)} />
          ) : null}
        </div>
      </div>
      {p.suspendedAt ? (
        <Alert tone="warning" title={`Suspended ${formatIstDateTime(p.suspendedAt)}`}>
          {p.suspendReason}
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Companies</h2>
            {d.companies.length ? (
              <ul className="flex flex-col divide-y divide-default">
                {d.companies.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block type-label">{c.name}</span>
                      <span className="block type-caption text-secondary">
                        {c.kind} · {c.role} · {c.verification}
                        {c.suspendedAt ? " · suspended" : ""}
                      </span>
                    </span>
                    {canEdit ? (
                      <SuspendCompany
                        userId={p.id}
                        organisationId={c.id}
                        name={c.name}
                        suspended={Boolean(c.suspendedAt)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-secondary">Not part of a company: a member.</p>
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Recent activity</h2>
            {d.activity.length ? (
              <ol className="flex flex-col gap-2">
                {d.activity.map((a) => (
                  <li key={`${a.at.toISOString()}${a.action}`} className="type-body-sm">
                    <span className="type-mono text-secondary">{formatIstDateTime(a.at)}</span> · {a.action} ·{" "}
                    {a.resourceType}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="type-body-sm text-secondary">Nothing recorded yet.</p>
            )}
            <Link href={`/admin/users/audit?actor=${p.id}`} className="type-label text-link">
              See all in the audit log
            </Link>
          </section>
        </div>
        <aside className="flex flex-col gap-6 self-start">
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Operator roles</h2>
            <p className="type-body-sm">{d.operatorRoles.length ? d.operatorRoles.join(", ") : "None"}</p>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Signed-in devices</h2>
            {d.sessions.length ? (
              d.sessions.map((s) => (
                <p key={s.updatedAt.toISOString()} className="type-caption text-secondary">
                  {s.userAgent?.slice(0, 60) ?? "Unknown device"} · {formatIstDateTime(s.updatedAt)}
                </p>
              ))
            ) : (
              <p className="type-caption text-secondary">Not signed in anywhere.</p>
            )}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
