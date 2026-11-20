import { getDb } from "@h2india/core";
import { grantableOperatorPermissions } from "@h2india/core/admin/staff";
import { operatorRoleGrid } from "@h2india/core/admin/users";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { RoleEditor } from "@/admin/users/Team";

// The role editor (founder, 20 Nov 2026): a new custom role (blank, or copied from another with ?from=), or a custom
// role to change (?id=). Built-in roles open only to be copied. Super admin only (roles.manage).
export const metadata: Metadata = { title: "Role · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RolePage({ searchParams }: { searchParams: Promise<{ id?: string; from?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("roles.manage", "/admin/users/roles/role");
  const db = getDb();
  const [roles, grantable] = await Promise.all([operatorRoleGrid(db, actor), grantableOperatorPermissions(db)]);
  const editing = sp.id ? roles.find((r) => r.id === sp.id) : undefined;
  if (sp.id && !editing) notFound();
  const from = sp.from ? roles.find((r) => r.name === sp.from) : undefined;
  const initial = editing
    ? { roleId: editing.id, name: editing.name, description: editing.description, permissions: editing.permissions }
    : {
        name: from ? `${from.name} (copy)` : "",
        description: from?.description ?? "",
        permissions: (from?.permissions ?? []).filter((k) => grantable.includes(k)),
      };
  const title = editing ? `Edit ${editing.name}` : from ? `New role from ${from.name}` : "New role";
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <div className="flex flex-col gap-1">
        <Link href="/admin/users/roles" className="inline-flex items-center gap-1 self-start type-label text-secondary">
          <Icon name="arrow-left" size={16} />
          Team and roles
        </Link>
        <h1 className="type-h2">{title}</h1>
        <p className="type-body-sm text-secondary">
          Tick what this role can do in each area. The summary on the right says it in plain words.
        </p>
      </div>
      <RoleEditor
        initial={initial}
        grantable={grantable}
        holders={editing?.people.length ?? 0}
        lockedBuiltIn={Boolean(editing && !editing.custom)}
      />
    </AdminShell>
  );
}
