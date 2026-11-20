import { getDb } from "@h2india/core";
import { listStaff } from "@h2india/core/admin/staff";
import { listUsers, operatorRoleGrid } from "@h2india/core/admin/users";
import { OPERATOR_ACTIONS, OPERATOR_AREAS, SENSITIVE_AREAS } from "@h2india/core/authz";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, Checkbox, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { CONTENT_SECTIONS } from "@/admin/cms/sections";
import { AdminShell, requireOperator } from "@/admin/shell";
import { AREA_LABEL, roleWords } from "@/admin/users/role-words";
import { Initials, UsersHeader, UserTabs } from "@/admin/users/Tabs";

// Team and roles (founder, 20 Nov 2026; was Operator roles, 656:8, step 11.4). First the team: who works in the back
// office, their role, the content sections they may change and when they were last active; a Super admin adds people
// in four steps. Then the roles: built-in ones as seeded (copy one to change it) and custom ones a Super admin made.
export const metadata: Metadata = { title: "Team and roles · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  view: "See",
  edit: "Change",
  delete: "Delete",
  export: "Export",
};

const sensitive = (area: string, action: string) =>
  action !== "view" && (SENSITIVE_AREAS as readonly string[]).includes(area);

const sectionNames = (ids: string[] | null) =>
  ids === null ? "All" : ids.map((id) => CONTENT_SECTIONS.find((s) => s.id === id)?.label ?? id).join(", ");

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/roles");
  const db = getDb();
  const [roles, staff, everyone] = await Promise.all([
    operatorRoleGrid(db, actor),
    listStaff(db, actor),
    listUsers(db, actor, { limit: 1 }),
  ]);
  const manage = actor.operator.has("roles.manage");
  const ordered = [...roles].sort(
    (a, b) => Number(a.custom) - Number(b.custom) || (a.name === "Super admin" ? -1 : b.name === "Super admin" ? 1 : 0),
  );
  const role = ordered.find((r) => r.name === sp.role) ?? ordered[0];
  const contentRoles = new Set(roles.filter((r) => r.permissions.includes("content.edit")).map((r) => r.name));

  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader />
      <UserTabs current="roles" counts={{ people: everyone.total, roles: roles.length }} />

      <section aria-labelledby="team" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-3xl flex-col gap-1">
            <h2 id="team" className="type-h3">
              Team
            </h2>
            <p className="type-body-sm text-secondary">
              Everyone who works in the back office. The Super admin can do everything and is the only one who adds
              people or changes roles.
            </p>
          </div>
          {manage ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/users/roles/role" className={buttonClasses({ variant: "outline" })}>
                <Icon name="plus" size={16} />
                New role
              </Link>
              <Link href="/admin/users/roles/add" className={buttonClasses({})}>
                <Icon name="plus" size={16} />
                Add a team member
              </Link>
            </div>
          ) : null}
        </div>
        {staff.length ? (
          <div
            tabIndex={0}
            role="region"
            aria-label="Team"
            className="relative overflow-x-auto rounded-card border border-default bg-page"
          >
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-subtle text-left type-caption text-secondary">
                  <th scope="col" className="px-4 py-3">
                    Person
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Role
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Content sections
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Last active
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.userId} className="border-t border-default">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Initials name={s.name || s.email} />
                        <span className="flex flex-col">
                          <span className="type-label">{s.name || s.email}</span>
                          <span className="type-caption text-secondary">{s.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">{s.roles.join(", ")}</td>
                    <td className="px-2 py-3 type-body-sm">
                      {s.roles.some((r) => contentRoles.has(r)) ? sectionNames(s.sections) : "—"}
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {s.lastActive ? formatIstDateTime(s.lastActive) : "Not yet"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/roles/person/${s.userId}`}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        {manage ? "Manage" : "View"}
                        <span className="sr-only"> {s.name || s.email}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="Nobody on the team yet">
              Add a team member to give someone back-office access.
            </EmptyState>
          </div>
        )}
      </section>

      <section aria-labelledby="roles" className="flex flex-col gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 id="roles" className="type-h3">
            Roles
          </h2>
          <p className="type-body-sm text-secondary">
            What each role can do. Built-in roles stay as they are; copy one to make your own.
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav
            aria-label="Roles"
            className="flex flex-col gap-1 self-start rounded-card border border-default bg-page p-3"
          >
            <ul className="flex flex-col gap-1">
              {ordered.map((r) => {
                const here = r.id === role?.id;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/users/roles?role=${encodeURIComponent(r.name)}#roles`}
                      aria-current={here ? "page" : undefined}
                      className={cx(
                        "flex flex-col gap-0.5 rounded-input border px-3 py-2",
                        here ? "border-focus bg-mint" : "border-transparent hover:bg-subtle",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="type-label">{r.name}</span>
                        <span className="type-caption text-secondary">
                          {r.custom ? "Custom · " : ""}
                          {r.people.length} {r.people.length === 1 ? "person" : "people"}
                        </span>
                      </span>
                      {r.description ? <span className="type-caption text-secondary">{r.description}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {role ? (
            <div className="flex flex-col gap-4">
              <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <h3 className="type-h4">{role.name}</h3>
                      <StatusBadge status={role.custom ? "Custom" : "Built-in"} tone="neutral" />
                    </span>
                    {role.description ? <p className="type-body-sm text-body">{role.description}</p> : null}
                  </div>
                  {manage ? (
                    <div className="flex flex-wrap gap-2">
                      {role.custom ? (
                        <Link
                          href={`/admin/users/roles/role?id=${role.id}`}
                          className={buttonClasses({ variant: "outline", size: "sm" })}
                        >
                          <Icon name="pencil" size={14} />
                          Edit role
                        </Link>
                      ) : null}
                      {role.name !== "Super admin" ? (
                        <Link
                          href={`/admin/users/roles/role?from=${encodeURIComponent(role.name)}`}
                          className={buttonClasses({ variant: "ghost", size: "sm" })}
                        >
                          <Icon name="copy" size={14} />
                          Copy to a new role
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="type-body-sm">
                  <span className="type-label">Can: </span>
                  {roleWords(role.permissions).can.join(" · ") || "nothing yet"}
                </p>
                <p className="type-caption text-secondary">
                  Held by {role.people.length ? role.people.map((p) => p.name || p.email).join(", ") : "nobody yet"}.
                </p>
              </section>
              <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
                <h3 className="type-h4">Permissions by area</h3>
                <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
                  <StatusBadge status="Sensitive" tone="warning" />
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
                          <th scope="row" className="px-3 py-2 text-left type-label">
                            {AREA_LABEL[area] ?? area}
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
                                        {AREA_LABEL[area] ?? area} {ACTION_LABEL[a]}: {on ? "allowed" : "not allowed"}
                                      </span>
                                    }
                                  />
                                  {sensitive(area, a) ? (
                                    <Icon
                                      name="alert-triangle"
                                      size={14}
                                      className="text-warning"
                                      aria-label="Sensitive"
                                    />
                                  ) : null}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
