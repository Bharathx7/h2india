import { getDb } from "@h2india/core";
import { listUsers, operatorRoleGrid } from "@h2india/core/admin/users";
import { formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, EmptyState, Icon, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { AutoSelect } from "@/admin/users/Controls";
import { Initials, UsersHeader, UserTabs } from "@/admin/users/Tabs";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";

// Users (651:8; states 657:1313), step 11.4: find anyone by name, email, mobile, company or GSTIN; filter by type,
// status and passkey.
export const metadata: Metadata = { title: "Users · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TYPES = [
  { value: "", label: "Type: all" },
  { value: "buyer", label: "Buyer" },
  { value: "supplier", label: "Supplier" },
  { value: "member", label: "Member" },
  { value: "operator", label: "Operator" },
];
const STATUSES = [
  { value: "", label: "Status: all" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];
const PASSKEYS = [
  { value: "", label: "Passkey: any" },
  { value: "with", label: "Has a passkey" },
  { value: "none", label: "No passkey" },
];
const PER = 50;

const typeOf = (x: { operator: string | null; kind: string | null }) =>
  x.operator
    ? "Operator"
    : x.kind === "supplier"
      ? "Supplier"
      : x.kind === "buyer"
        ? "Buyer"
        : x.kind === "both"
          ? "Buyer and supplier"
          : "Member";
const roleWord = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
const ist = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o });

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    passkey?: string;
    page?: string;
    state?: string;
  }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users");
  const type = (["buyer", "supplier", "member", "operator"] as const).find((t) => t === sp.type);
  const status = sp.status === "suspended" || sp.status === "active" ? sp.status : undefined;
  const passkey = sp.passkey === "with" || sp.passkey === "none" ? sp.passkey : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();
  const [{ rows, total }, everyone, roles] = await Promise.all([
    listUsers(db, actor, {
      q: sp.q?.trim() || undefined,
      type,
      status,
      passkey,
      limit: PER,
      offset: (page - 1) * PER,
    }),
    listUsers(db, actor, { limit: 1 }),
    operatorRoleGrid(db, actor),
  ]);
  const qs = (p: Record<string, string | undefined>) =>
    new URLSearchParams(
      Object.entries({ q: sp.q, type, status, passkey, ...p }).filter((e): e is [string, string] => Boolean(e[1])),
    ).toString();
  const today = ist(new Date(), { dateStyle: "short" });
  const filtered = Boolean(sp.q?.trim() || type || status || passkey);
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader />
      <UserTabs current="people" counts={{ people: everyone.total, roles: roles.length }} />
      <form method="get" className="flex flex-wrap gap-3">
        <label className="relative min-w-60 flex-1 md:max-w-sm">
          <span className="sr-only">Search name, email, mobile or GSTIN</span>
          <Icon name="search" size={18} className="absolute top-3 left-3 text-icon-secondary" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search name, email, mobile or GSTIN"
            className="h-11 w-full rounded-control border-[1.5px] border-control bg-page pr-3 pl-10 type-body"
          />
        </label>
        <AutoSelect name="type" label="Type" value={type ?? ""} options={TYPES} />
        <AutoSelect name="status" label="Status" value={status ?? ""} options={STATUSES} />
        <AutoSelect name="passkey" label="Passkey" value={passkey ?? ""} options={PASSKEYS} />
        <button type="submit" className="sr-only">
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
            <EmptyState
              kind="no-results"
              icon="search"
              title={sp.q ? `No one matches "${sp.q}"` : "No one matches these filters"}
              action={
                filtered ? (
                  <Link href="/admin/users" className={buttonClasses({})}>
                    Clear search
                  </Link>
                ) : undefined
              }
            >
              Check the spelling, or search by mobile number, GSTIN or organisation instead.
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
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Person
                </th>
                <th scope="col" className="px-2 py-3">
                  Organisation and role
                </th>
                <th scope="col" className="px-2 py-3">
                  Type
                </th>
                <th scope="col" className="px-2 py-3">
                  Passkey
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
              {rows.map((x) => {
                const last = x.lastActive ? new Date(x.lastActive) : null;
                return (
                  <tr key={x.id} className="border-t border-default">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Initials name={x.name || x.email} />
                        <span>
                          <span className="block type-label">{x.name || x.email}</span>
                          <span className="block type-caption text-secondary">{x.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {x.operator ? (
                        <>
                          <span className="block type-body-sm">H2 India</span>
                          <span className="block type-caption text-secondary">{x.operator}</span>
                        </>
                      ) : x.organisation ? (
                        <>
                          <span className="block type-body-sm">{x.organisation}</span>
                          <span className="block type-caption text-secondary">{roleWord(x.role ?? "")}</span>
                        </>
                      ) : (
                        <span className="type-body-sm">No organisation</span>
                      )}
                    </td>
                    <td className="px-2 py-3 type-body-sm">{typeOf(x)}</td>
                    <td className="px-2 py-3">
                      <StatusBadge
                        status={
                          x.passkeys
                            ? `${String(x.passkeys)} ${x.passkeys === 1 ? "passkey" : "passkeys"}`
                            : "No passkey"
                        }
                        tone={x.passkeys ? "success" : "warning"}
                      />
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {last
                        ? ist(last, { dateStyle: "short" }) === today
                          ? `Today, ${ist(last, { hour: "numeric", minute: "2-digit" })}`
                          : formatIstDayMonth(last)
                        : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge
                        status={x.suspendedAt ? "Suspended" : x.orgSuspended ? "Company suspended" : "Active"}
                        tone={x.suspendedAt ? "error" : x.orgSuspended ? "warning" : "success"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/users/${x.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                        Open<span className="sr-only"> {x.name || x.email}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </LiveSection>
      <div className="flex items-center justify-between type-caption text-secondary">
        <span>
          {total
            ? `Showing ${String((page - 1) * PER + 1)}–${String(Math.min(page * PER, total))} of ${total.toLocaleString("en-IN")}`
            : ""}
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
