import { getDb } from "@h2india/core";
import { listUsers, operatorRoleGrid } from "@h2india/core/admin/users";
import { can, OPERATOR_ACTIONS, OPERATOR_AREAS, SENSITIVE_AREAS } from "@h2india/core/authz";
import { Checkbox, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { RoleMember } from "@/admin/users/Controls";
import { Initials, UsersHeader, UserTabs } from "@/admin/users/Tabs";

// Operator roles (656:8), step 11.4: each role, who holds it and its permissions by area, with the areas the design
// marks Sensitive. Permissions are data (step 3.4) changed by a seed migration, so the grid is shown read-only here;
// a Super admin adds and removes people below. Two-person approval for payouts arrives with Money (step 11.6).
export const metadata: Metadata = { title: "Operator roles · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  view: "View",
  edit: "Create or edit",
  delete: "Delete",
  export: "Export",
};
const people = (n: number) => `${String(n)} ${n === 1 ? "person" : "people"}`;
const sensitive = (area: string, action: string) =>
  action !== "view" && (SENSITIVE_AREAS as readonly string[]).includes(area);

function Sensitive() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-warning px-2 py-0.5 type-caption text-warning">
      <Icon name="alert-triangle" size={12} />
      Sensitive
    </span>
  );
}

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/roles");
  const db = getDb();
  const [roles, everyone] = await Promise.all([operatorRoleGrid(db, actor), listUsers(db, actor, { limit: 1 })]);
  const role = roles.find((r) => r.name === sp.role) ?? roles[0];
  const operators = new Set(roles.flatMap((r) => r.people.map((p) => p.userId))).size;
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader />
      <UserTabs current="roles" counts={{ people: everyone.total, roles: roles.length }} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav
          aria-label="Roles"
          className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-4"
        >
          <div>
            <h2 className="type-h4">Roles</h2>
            <p className="type-caption text-secondary">
              {roles.length} roles · {operators} operators
            </p>
          </div>
          <ul className="flex flex-col gap-1">
            {roles.map((r) => {
              const here = r.id === role?.id;
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/users/roles?role=${encodeURIComponent(r.name)}`}
                    aria-current={here ? "page" : undefined}
                    className={cx(
                      "flex flex-col gap-0.5 rounded-input border px-3 py-2",
                      here ? "border-focus bg-mint" : "border-transparent hover:bg-subtle",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="type-label">{r.name}</span>
                      <span className="type-caption text-secondary">{people(r.people.length)}</span>
                    </span>
                    {r.description ? <span className="type-caption text-secondary">{r.description}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {role ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h3">{role.name}</h2>
              {role.description ? <p className="type-body-sm text-body">{role.description}</p> : null}
              {role.people.length ? (
                <ul className="flex flex-wrap gap-4">
                  {role.people.map((p) => (
                    <li key={p.userId}>
                      <Link href={`/admin/users/${p.userId}`} className="flex items-center gap-2 type-body-sm">
                        <Initials name={p.name || p.email} />
                        {p.name || p.email}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-body-sm text-secondary">Nobody holds this role yet.</p>
              )}
            </section>
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Permissions by area</h2>
              <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
                <Sensitive />
                Moves money, shows bank or personal data, or changes who can do what.
              </p>
              <div
                tabIndex={0}
                role="region"
                aria-label={`${role.name} permissions`}
                className="relative overflow-x-auto"
              >
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-subtle text-left type-caption text-secondary">
                      <th scope="col" className="px-3 py-2">
                        Area
                      </th>
                      {OPERATOR_ACTIONS.map((a) => (
                        <th key={a} scope="col" className="px-3 py-2">
                          {ACTION_LABEL[a]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OPERATOR_AREAS.map((area) => (
                      <tr key={area} className="border-t border-default">
                        <th scope="row" className="px-3 py-2 text-left type-label capitalize">
                          {area}
                        </th>
                        {OPERATOR_ACTIONS.map((a) => {
                          const on = role.permissions.includes(`${area}.${a}`);
                          return (
                            <td key={a} className="px-3 py-2">
                              <span className="flex items-center gap-2">
                                <Checkbox
                                  checked={on}
                                  disabled
                                  label={
                                    <span className="sr-only">
                                      {area} {ACTION_LABEL[a]}: {on ? "allowed" : "not allowed"}
                                    </span>
                                  }
                                />
                                {sensitive(area, a) ? <Sensitive /> : null}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="type-caption text-secondary">
                Permissions change through a reviewed update, so every change is in the history and the audit log.
              </p>
            </section>
            {can(actor, "roles.manage") ? (
              <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
                <h2 className="type-h4">Add or remove people</h2>
                <RoleMember roles={roles.map((r) => r.name)} />
              </section>
            ) : (
              <StatusBadge status="Only a Super admin changes who holds a role" tone="neutral" />
            )}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
