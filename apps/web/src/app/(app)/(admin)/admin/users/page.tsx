import { getDb } from "@h2india/core";
import { listUsers, operatorRoleGrid } from "@h2india/core/admin/users";
import { can } from "@h2india/core/authz";
import { formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, EmptyState, Icon, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { AutoSelect } from "@/admin/users/Controls";
import { Initials, UsersHeader, UserTabs } from "@/admin/users/Tabs";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { ListPager } from "@/components/ListPager";
import { pageRequest, pageWindow, pagingQuery } from "@/lib/paging";

// Users (651:8; states 657:1313), step 11.4: find anyone by name, email, mobile, company or GSTIN; filter by type,
// status.
export const metadata: Metadata = { title: "Users · H2 Economy admin", robots: { index: false } };
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
    page?: string;
    perPage?: string;
    state?: string;
  }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users");
  const type = (["buyer", "supplier", "member", "operator"] as const).find((t) => t === sp.type);
  const status = sp.status === "suspended" || sp.status === "active" ? sp.status : undefined;
  const req = pageRequest(sp);
  const db = getDb();
  const [{ rows, total }, everyone, roles] = await Promise.all([
    listUsers(db, actor, {
      q: sp.q?.trim() || undefined,
      type,
      status,
      ...pageWindow(req),
    }),
    listUsers(db, actor, { limit: 1 }),
    operatorRoleGrid(db, actor),
  ]);
  const query = pagingQuery(sp);
  // A page past the end (the list shrank, or an old link) goes to the last page, like the other workspace lists.
  const last = Math.max(1, Math.ceil(total / req.perPage));
  if (req.page > last) {
    redirect(
      `/admin/users?${new URLSearchParams({ ...query, page: String(last), perPage: String(req.perPage) }).toString()}`,
    );
  }
  const today = ist(new Date(), { dateStyle: "short" });
  const filtered = Boolean(sp.q?.trim() || type || status);
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader
        action={
          can(actor, "users.edit") ? (
            <Link href="/admin/users/companies/new" className={buttonClasses({})}>
              <Icon name="plus" size={18} />
              Add a supplier
            </Link>
          ) : undefined
        }
      />
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
                          <span className="block type-body-sm">H2 Economy</span>
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
        <ListPager paged={{ page: req.page, perPage: req.perPage, total }} query={query} className="mt-4" />
      </LiveSection>
    </AdminShell>
  );
}
