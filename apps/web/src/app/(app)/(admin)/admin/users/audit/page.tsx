import { AUDIT_RETENTION_YEARS, getDb, readAuditLog } from "@h2india/core";
import { actorLabels, listUsers, operatorRoleGrid } from "@h2india/core/admin/users";
import { can } from "@h2india/core/authz";
import { buttonClasses, EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { oldToNew } from "@/admin/users/changes";
import { AutoSelect } from "@/admin/users/Controls";
import { UsersHeader, UserTabs } from "@/admin/users/Tabs";
import { actionWords, deviceOf } from "@/admin/users/words";

// Audit log (656:872; states 657:1313), step 11.4: every recorded action with who, what, the change, why and from
// where, newest first, and an export for those with users.export. Append-only. The Organisation filter the frame
// draws isn't here yet: entries are filtered by person, record type and dates.
export const metadata: Metadata = { title: "Audit log · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const LIMIT = 200;
const ist = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o });
const typeWord = (t: string) => {
  const w = t.replace(/[_-]+/g, " ");
  return w.toLowerCase() === "rfq" ? "RFQ" : w.charAt(0).toUpperCase() + w.slice(1);
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; q?: string; type?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/audit");
  const day = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const from = day(sp.from);
  const to = day(sp.to);
  const filter = {
    actorId: sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor) ? sp.actor : undefined,
    resourceType: sp.type?.trim() || undefined,
    from: from ? new Date(`${from}T00:00:00+05:30`) : undefined,
    to: to ? new Date(`${to}T23:59:59+05:30`) : undefined,
  };
  const db = getDb();
  const [all, everyone, roles] = await Promise.all([
    readAuditLog(db, actor, filter, { limit: LIMIT }),
    listUsers(db, actor, { limit: 1 }),
    operatorRoleGrid(db, actor),
  ]);
  const q = sp.q?.trim().toLowerCase() ?? "";
  const rows = q
    ? all.filter((r) =>
        `${r.action} ${actionWords(r.action)} ${r.resourceType} ${r.resourceId ?? ""} ${r.reason ?? ""}`
          .toLowerCase()
          .includes(q),
      )
    : all;
  const names = await actorLabels(
    db,
    actor,
    all.flatMap((r) => (r.actorId ? [r.actorId] : [])),
  );
  const actorOptions = [
    { value: "", label: "Actor: anyone" },
    ...[...names.entries()].map(([id, n]) => ({ value: id, label: n.name })),
  ];
  if (filter.actorId && !names.has(filter.actorId))
    actorOptions.push({ value: filter.actorId, label: "Chosen person" });
  const types = [...new Set(all.map((r) => r.resourceType))].sort();
  if (filter.resourceType && !types.includes(filter.resourceType)) types.push(filter.resourceType);
  const qs = new URLSearchParams(
    Object.entries({ actor: filter.actorId, type: filter.resourceType, from, to }).filter((e): e is [string, string] =>
      Boolean(e[1]),
    ),
  ).toString();
  const filtered = Boolean(q || filter.actorId || filter.resourceType || from || to);
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader />
      <UserTabs current="audit" counts={{ people: everyone.total, roles: roles.length }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-sm text-body">
          Append-only: entries can&apos;t be changed or deleted. All times in IST.
        </p>
        {can(actor, "users.export") ? (
          <a href={`/admin/users/audit/export?${qs}`} className={buttonClasses({ variant: "outline" })}>
            <Icon name="download" size={16} />
            Export CSV
          </a>
        ) : null}
      </div>
      <form method="get" className="flex flex-wrap gap-3">
        <label className="relative min-w-60 flex-1 md:max-w-xs">
          <span className="sr-only">Search actions or objects</span>
          <Icon name="search" size={18} className="absolute top-3 left-3 text-icon-secondary" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search actions or objects"
            className="h-11 w-full rounded-control border-[1.5px] border-control bg-page pr-3 pl-10 type-body"
          />
        </label>
        <AutoSelect name="actor" label="Actor" value={filter.actorId ?? ""} options={actorOptions} />
        <AutoSelect
          name="type"
          label="Object type"
          value={filter.resourceType ?? ""}
          options={[{ value: "", label: "Object type: all" }, ...types.map((t) => ({ value: t, label: typeWord(t) }))]}
        />
        <span className="flex items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3">
          <Icon name="calendar" size={16} />
          <input
            name="from"
            type="date"
            defaultValue={from}
            aria-label="From"
            className="h-10 bg-transparent type-body-sm"
          />
          <span aria-hidden="true">–</span>
          <input name="to" type="date" defaultValue={to} aria-label="To" className="h-10 bg-transparent type-body-sm" />
        </span>
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Apply
        </button>
      </form>
      {rows.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Audit log"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Time (IST)
                </th>
                <th scope="col" className="px-2 py-3">
                  Actor
                </th>
                <th scope="col" className="px-2 py-3">
                  Action
                </th>
                <th scope="col" className="px-2 py-3">
                  Object
                </th>
                <th scope="col" className="px-2 py-3">
                  Old → new
                </th>
                <th scope="col" className="px-2 py-3">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3">
                  IP and device
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const who = r.actorId ? names.get(r.actorId) : null;
                return (
                  <tr key={r.id} className="border-t border-default align-top">
                    <td className="px-4 py-3">
                      <span className="block type-mono">{ist(r.at, { day: "numeric", month: "short" })}</span>
                      <span className="block type-caption text-secondary">
                        {ist(r.at, { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {r.actorId ? (
                        <Link href={`/admin/users/${r.actorId}`} className="block type-label hover:underline">
                          {who?.name ?? "Former account"}
                        </Link>
                      ) : (
                        <span className="block type-label">System</span>
                      )}
                      <span className="block type-caption text-secondary">
                        {r.actorId ? (who?.detail ?? "") : "Automatic"}
                      </span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {actionWords(r.action)}
                      {r.actingAsId ? (
                        <span className="block type-caption text-secondary">While viewing as someone</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <span className="block type-caption text-secondary">{typeWord(r.resourceType)}</span>
                      <span className="block type-mono">{r.resourceId?.slice(0, 13) ?? "—"}</span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">{oldToNew(r.before, r.after)}</td>
                    <td className="px-2 py-3 type-body-sm">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="block type-mono">{r.ip ?? "—"}</span>
                      {r.userAgent ? (
                        <span className="block type-caption text-secondary">{deviceOf(r.userAgent)}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState
            kind="no-results"
            icon="clock"
            title="No entries for these filters"
            action={
              filtered ? (
                <Link href="/admin/users/audit" className={buttonClasses({})}>
                  Clear filters
                </Link>
              ) : undefined
            }
          >
            Try a wider date range or another actor. Entries are never deleted, so an empty range means nothing was
            logged.
          </EmptyState>
        </div>
      )}
      <p className="type-caption text-secondary">
        Showing {rows.length.toLocaleString("en-IN")} of the newest {LIMIT} entries
        {from || to ? ` from ${from ?? "the start"} to ${to ?? "today"}` : ""}. Kept for {AUDIT_RETENTION_YEARS} years.
      </p>
    </AdminShell>
  );
}
