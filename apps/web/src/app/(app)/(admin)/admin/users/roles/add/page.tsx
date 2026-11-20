import { getDb } from "@h2india/core";
import { operatorRoleGrid } from "@h2india/core/admin/users";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { CONTENT_SECTIONS } from "@/admin/cms/sections";
import { AdminShell, requireOperator } from "@/admin/shell";
import { AddTeamMember } from "@/admin/users/Team";

// Add a team member (founder, 20 Nov 2026): who, role, content sections (editors only), check and add. Super admin only
// (roles.manage); the account is made if there is none and they get a link to set their password.
export const metadata: Metadata = { title: "Add a team member · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AddMemberPage() {
  const { userId, actor } = await requireOperator("roles.manage", "/admin/users/roles/add");
  const roles = await operatorRoleGrid(getDb(), actor);
  const ordered = [...roles].sort(
    (a, b) => Number(a.custom) - Number(b.custom) || (a.name === "Super admin" ? 1 : b.name === "Super admin" ? -1 : 0),
  );
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <div className="flex flex-col gap-1">
        <Link href="/admin/users/roles" className="inline-flex items-center gap-1 self-start type-label text-secondary">
          <Icon name="arrow-left" size={16} />
          Team and roles
        </Link>
        <h1 className="type-h2">Add a team member</h1>
        <p className="type-body-sm text-secondary">
          Four short steps. They get an email to set their password, then sign in at the staff sign-in.
        </p>
      </div>
      <AddTeamMember
        roles={ordered.map((r) => ({
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          custom: r.custom,
        }))}
        sections={CONTENT_SECTIONS.map((s) => ({ id: s.id, label: s.label, description: s.description }))}
      />
    </AdminShell>
  );
}
