import { getDb } from "@h2india/core";
import { listUsers } from "@h2india/core/admin/users";
import { formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { UserTabs } from "@/admin/users/Tabs";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";

// Users (651:8; states 657:1313), step 11.4: find anyone by name or email, by type and status.
export const metadata: Metadata = { title: "Users · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TYPES = [
  { key: "", label: "Everyone" },
  { key: "buyer", label: "Buyers" },
  { key: "supplier", label: "Suppliers" },
  { key: "member", label: "Members" },
  { key: "operator", label: "Operators" },
] as const;
const PER = 50;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users");
  const type = TYPES.find((t) => t.key === sp.type)?.key || undefined;
  const status = sp.status === "suspended" || sp.status === "active" ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listUsers(getDb(), actor, {
    q: sp.q?.trim() || undefined,
    type,
    status,
    limit: PER,
    offset: (page - 1) * PER,
  });
  const qs = (p: Record<string, string | undefined>) =>
    new URLSearchParams(
      Object.entries({ q: sp.q, type, status, ...p }).filter((e): e is [string, string] => Boolean(e[1])),
    ).toString();
  const today = new Date().toDateString();
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <div>
        <h1 className="type-h2">Users</h1>
        <p className="type-body-sm text-secondary">
          Everyone with an account: buyers, suppliers, members and operators.
        </p>
      </div>
      <UserTabs current="people" />
      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <Link
            key={t.key}
            href={`/admin/users?${qs({ type: t.key || undefined, page: undefined })}`}
            aria-current={(type ?? "") === t.key ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
              (type ?? "") === t.key ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap gap-3">
        {type ? <input type="hidden" name="type" value={type} /> : null}
        <input
          name="q"
          defaultValue={sp.q}
          aria-label="Search name or email"
          placeholder="Search name or email"
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body md:max-w-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Status"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="">Status: all</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Search
        </button>
      </form>
      <LiveSection
        label="Users"
        state={forcedState(sp.state) ?? (rows.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-2">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState kind="no-results" title={sp.q ? `Nobody matches "${sp.q}"` : "Nobody here"}>
              Try part of the name or the email address.
            </EmptyState>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="region"
          aria-label="Users"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Person
                </th>
                <th scope="col" className="px-2 py-3">
                  Companies and roles
                </th>
                <th scope="col" className="px-2 py-3">
                  Last active
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-default align-top">
                  <td className="px-4 py-3">
                    <span className="block type-label">{x.name || "—"}</span>
                    <span className="block type-caption text-secondary">{x.email}</span>
                  </td>
                  <td className="px-2 py-3 type-body-sm">
                    {[x.companies, x.operator ? `Operator: ${x.operator}` : null].filter(Boolean).join(" · ") ||
                      "Member"}
                  </td>
                  <td className="px-2 py-3 type-body-sm">
                    {x.lastActive
                      ? new Date(x.lastActive).toDateString() === today
                        ? "Today"
                        : formatIstDayMonth(new Date(x.lastActive))
                      : "—"}
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge
                      status={x.suspendedAt ? "Suspended" : "Active"}
                      tone={x.suspendedAt ? "error" : "success"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${x.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                      Open<span className="sr-only"> {x.name || x.email}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LiveSection>
      <div className="flex items-center justify-between type-caption text-secondary">
        <span>
          Showing {(page - 1) * PER + 1}–{Math.min(page * PER, total)} of {total}
        </span>
        <span className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/users?${qs({ page: String(page - 1) })}`}
              className={buttonClasses({ variant: "outline", size: "sm" })}
            >
              Previous
            </Link>
          ) : null}
          {page * PER < total ? (
            <Link
              href={`/admin/users?${qs({ page: String(page + 1) })}`}
              className={buttonClasses({ variant: "outline", size: "sm" })}
            >
              Next
            </Link>
          ) : null}
        </span>
      </div>
    </AdminShell>
  );
}
