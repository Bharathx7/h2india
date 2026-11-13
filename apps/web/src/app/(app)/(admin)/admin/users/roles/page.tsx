import { getDb } from "@h2india/core";
import { operatorRoleGrid } from "@h2india/core/admin/users";
import { can, OPERATOR_ACTIONS, OPERATOR_AREAS } from "@h2india/core/authz";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import { AdminShell, requireOperator } from "@/admin/shell";
import { RoleMember } from "@/admin/users/Controls";
import { UserTabs } from "@/admin/users/Tabs";

// Operator roles (656:8), step 11.4: each role's permissions by area, who holds it, and adding or removing people
// (Super admin only). Permissions are data (step 3.4): a change applies at once.
export const metadata: Metadata = { title: "Operator roles · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/roles");
  const roles = await operatorRoleGrid(getDb(), actor);
  const role = roles.find((r) => r.name === sp.role) ?? roles[0];
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <div>
        <h1 className="type-h2">Users</h1>
        <p className="type-body-sm text-secondary">What each operator role can do, and who holds it.</p>
      </div>
      <UserTabs current="roles" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Roles" className="self-start rounded-card border border-default bg-page p-2">
          <ul className="flex flex-col gap-1">
            {roles.map((r) => (
              <li key={r.id}>
                <a
                  href={`/admin/users/roles?role=${encodeURIComponent(r.name)}`}
                  aria-current={r.id === role?.id ? "page" : undefined}
                  className={
                    r.id === role?.id
                      ? "block rounded-input bg-mint px-3 py-2 type-label"
                      : "block rounded-input px-3 py-2 type-body-sm hover:bg-subtle"
                  }
                >
                  {r.name} <span className="text-secondary">· {r.people.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {role ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h3">{role.name}</h2>
              <p className="type-body-sm text-secondary">{role.description}</p>
              <div
                tabIndex={0}
                role="region"
                aria-label={`${role.name} permissions`}
                className="relative overflow-x-auto"
              >
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="bg-subtle text-left type-caption text-secondary">
                      <th scope="col" className="px-3 py-2">
                        Area
                      </th>
                      {OPERATOR_ACTIONS.map((a) => (
                        <th key={a} scope="col" className="px-3 py-2 text-center capitalize">
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OPERATOR_AREAS.map((area) => (
                      <tr key={area} className="border-t border-default">
                        <th scope="row" className="px-3 py-2 text-left type-body-sm font-normal capitalize">
                          {area}
                        </th>
                        {OPERATOR_ACTIONS.map((a) => {
                          const on = role.permissions.includes(`${area}.${a}`);
                          return (
                            <td key={a} className="px-3 py-2 text-center">
                              {on ? <Icon name="check" size={16} /> : <span className="text-secondary">—</span>}
                              <span className="sr-only">{on ? "Allowed" : "Not allowed"}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">People with this role</h2>
              {role.people.length ? (
                <ul className="flex flex-col gap-1">
                  {role.people.map((p) => (
                    <li key={p.userId} className="type-body-sm">
                      <a href={`/admin/users/${p.userId}`} className="type-label underline">
                        {p.name || p.email}
                      </a>{" "}
                      · {p.email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-body-sm text-secondary">Nobody yet.</p>
              )}
              {can(actor, "roles.manage") ? <RoleMember roles={roles.map((r) => r.name)} /> : null}
            </section>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
