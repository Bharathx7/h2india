import { AUDIT_RETENTION_YEARS, getDb, readAuditLog } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { UserTabs } from "@/admin/users/Tabs";

// Audit log (656:872), step 11.4: every recorded action with who, what, when and why, filtered, newest first, and an
// export for those with users.export.
export const metadata: Metadata = { title: "Audit log · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string; type?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/audit");
  const filter = {
    actorId: sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor) ? sp.actor : undefined,
    action: sp.action?.trim() || undefined,
    resourceType: sp.type?.trim() || undefined,
    from: sp.from ? new Date(`${sp.from}T00:00:00+05:30`) : undefined,
    to: sp.to ? new Date(`${sp.to}T23:59:59+05:30`) : undefined,
  };
  const rows = await readAuditLog(getDb(), actor, filter, { limit: 200 });
  const qs = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1]))).toString();
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Users</h1>
          <p className="type-body-sm text-secondary">
            Every status change, permission change, setting change, money action and admin action.
          </p>
        </div>
        {can(actor, "users.export") ? (
          <a href={`/admin/users/audit/export?${qs}`} className={buttonClasses({ variant: "outline" })}>
            Export CSV
          </a>
        ) : null}
      </div>
      <UserTabs current="audit" />
      <form method="get" className="grid gap-3 md:grid-cols-5">
        {filter.actorId ? <input type="hidden" name="actor" value={filter.actorId} /> : null}
        <input
          name="action"
          defaultValue={sp.action}
          aria-label="Action"
          placeholder="Action, e.g. user.suspended"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        />
        <input
          name="type"
          defaultValue={sp.type}
          aria-label="Record type"
          placeholder="Record type, e.g. rfq"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        />
        <input
          name="from"
          type="date"
          defaultValue={sp.from}
          aria-label="From"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        />
        <input
          name="to"
          type="date"
          defaultValue={sp.to}
          aria-label="To"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        />
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Filter
        </button>
      </form>
      {filter.actorId ? (
        <p className="type-caption text-secondary">
          Actions by one person ·{" "}
          <Link href="/admin/users/audit" className="underline">
            Clear
          </Link>
        </p>
      ) : null}
      {rows.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Audit log"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  When (IST)
                </th>
                <th scope="col" className="px-2 py-3">
                  Who
                </th>
                <th scope="col" className="px-2 py-3">
                  Action
                </th>
                <th scope="col" className="px-2 py-3">
                  Record
                </th>
                <th scope="col" className="px-2 py-3">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3">
                  Request
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-default align-top">
                  <td className="px-4 py-3 type-mono">{formatIstDateTime(r.at)}</td>
                  <td className="px-2 py-3 type-body-sm">
                    {r.actorId ? (
                      <Link href={`/admin/users/${r.actorId}`} className="underline">
                        {r.actorId.slice(0, 8)}
                      </Link>
                    ) : (
                      "System"
                    )}
                  </td>
                  <td className="px-2 py-3 type-label-sm">{r.action}</td>
                  <td className="px-2 py-3 type-body-sm">
                    {r.resourceType} · <span className="type-mono">{r.resourceId?.slice(0, 12)}</span>
                  </td>
                  <td className="px-2 py-3 type-body-sm">{r.reason ?? "—"}</td>
                  <td className="px-4 py-3 type-mono text-secondary">{r.requestId?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState kind="no-results" title="Nothing matches">
            Try a wider date range or fewer filters.
          </EmptyState>
        </div>
      )}
      <p className="type-caption text-secondary">Showing the newest 200. Kept for {AUDIT_RETENTION_YEARS} years.</p>
    </AdminShell>
  );
}
