import { getDb } from "@h2india/core";
import { roleGrid, scopeFor } from "@h2india/core/authz";
import { companyRoles, teamView } from "@h2india/core/supplier";
import { formatIstDayMonth } from "@h2india/core/time";
import { StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import { InviteMember, JoinRequest, MemberMenu, RevokeInvite } from "@/supplier/TeamControls";
import { RolePermissions } from "@/supplier/RolePermissions";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Team and permissions (592:371; phones 594:564; Dialog Remove team member 685:318), step 8.7. Founder QC (17 Nov 2026):
// the roles' permissions are a grid of ticks the company admin can change (RolePermissions, setRolePermission).
export const metadata: Metadata = { title: "Team · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default async function TeamPage() {
  const page = await requireSupplier("/supplier/team");
  const s = page.supplier;
  const db = getDb();
  const [team, roles, grid] = await Promise.all([
    teamView(db, scopeFor(page.actor), s.organisationId),
    companyRoles(db, s.organisationId),
    roleGrid(db, page.actor, s.organisationId),
  ]);
  const manage = s.seat.permissions.has("team.manage");
  const today = new Date().toDateString();
  const active = (d: Date | null) =>
    !d ? "—" : new Date(d).toDateString() === today ? "Today" : formatIstDayMonth(new Date(d));
  return (
    <SupplierShell page={page} current="/supplier/team" title="Team">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Team</h1>
          <p className="type-body-sm text-secondary">Who at {s.tradeName} can quote, manage products and see money.</p>
        </div>
        {manage ? <InviteMember roles={roles} /> : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
          {team.requests.length && manage ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">
                {team.requests.length} {team.requests.length === 1 ? "person" : "people"} asked to join {s.tradeName}
              </h2>
              {team.requests.map((q) => (
                <div key={q.id} className="flex flex-wrap items-center gap-3 border-t border-default pt-3">
                  <span className="flex size-10 items-center justify-center rounded-pill bg-mint type-label">
                    {initials(q.name || q.email)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block type-label">{q.name || q.email}</span>
                    <span className="block type-caption text-secondary">
                      {q.email} · asked {formatIstDayMonth(q.createdAt)}
                    </span>
                  </span>
                  <JoinRequest id={q.id} name={q.name || q.email} />
                </div>
              ))}
            </section>
          ) : null}
          <div
            tabIndex={0}
            role="region"
            aria-label="Team members"
            className="relative overflow-x-auto rounded-card border border-default bg-page"
          >
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-subtle text-left type-caption text-secondary">
                  <th scope="col" className="px-4 py-3">
                    Member
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Role
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Last active
                  </th>
                  <th scope="col" className="px-2 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((x) => (
                  <tr key={x.userId} className="border-t border-default">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-pill bg-mint type-label-sm">
                          {initials(x.name || x.email)}
                        </span>
                        <span>
                          <span className="block type-label">
                            {x.name || x.email}
                            {x.userId === page.userId ? " (you)" : ""}
                          </span>
                          <span className="block type-caption text-secondary">{x.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={x.role} tone="neutral" />
                    </td>
                    <td className="px-2 py-3 type-body-sm">{active(x.lastActive)}</td>
                    <td className="px-2 py-3 text-right">
                      {manage ? (
                        <MemberMenu
                          userId={x.userId}
                          name={x.name || x.email}
                          email={x.email}
                          role={x.role}
                          lastActive={active(x.lastActive)}
                          company={s.tradeName}
                          roles={roles.map((r) => r.name)}
                          self={x.userId === page.userId}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
                {team.invitations.map((i) => (
                  <tr key={i.id} className="border-t border-default">
                    <td className="px-4 py-3">
                      <span className="block type-label">{i.email}</span>
                      <span className="block type-caption text-secondary">
                        Expires {formatIstDayMonth(i.expiresAt)}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={i.role} tone="neutral" />
                    </td>
                    <td className="px-2 py-3 type-body-sm">—</td>
                    <td className="px-2 py-3">
                      <StatusBadge status="Invite sent" tone="warning" />
                    </td>
                    <td className="px-2 py-3 text-right">
                      {manage ? <RevokeInvite id={i.id} email={i.email} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">What each role can do</h2>
          <dl className="flex flex-col gap-3">
            {roles.map((r) => (
              <div key={r.name}>
                <dt className="type-label">{r.name}</dt>
                <dd className="type-caption text-secondary">{r.description}</dd>
              </div>
            ))}
          </dl>
          <p className="type-caption text-secondary">
            Admins confirm payout bank changes with a code sent to their email.
          </p>
        </aside>
      </div>
      <section aria-labelledby="permissions" className="flex flex-col gap-3">
        <div>
          <h2 id="permissions" className="type-h3">
            Roles and permissions
          </h2>
          <p className="type-body-sm text-secondary">
            Tick what each role at {s.tradeName} can do. Everyone with that role gets the change.
          </p>
        </div>
        <RolePermissions permissions={grid.permissions} roles={grid.roles} canEdit={manage} />
      </section>
    </SupplierShell>
  );
}
