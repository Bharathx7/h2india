import { userPhotoLinks } from "@h2india/core/account";
import { getDb } from "@h2india/core";
import { listStaff } from "@h2india/core/admin/staff";
import { operatorRoleGrid } from "@h2india/core/admin/users";
import { formatIstDateTime } from "@h2india/core/time";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTENT_SECTIONS } from "@/admin/cms/sections";
import { AdminShell, requireOperator } from "@/admin/shell";
import { roleWords } from "@/admin/users/role-words";
import { Initials } from "@/admin/users/Tabs";
import { PersonAccess } from "@/admin/users/Team";

// A team member's access (founder, 20 Nov 2026): their roles in plain words, the content sections they may change,
// and Remove from a role. Anyone with users.view sees it; only a Super admin changes it.
export const metadata: Metadata = { title: "Team member · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("users.view", `/admin/users/roles/person/${id}`);
  const db = getDb();
  const [staff, roles] = await Promise.all([listStaff(db, actor), operatorRoleGrid(db, actor)]);
  const person = staff.find((s) => s.userId === id);
  if (!person) notFound();
  const held = roles.filter((r) => person.roles.includes(r.name));
  const photos = await userPhotoLinks(db, actor, [person.userId]);
  const permissions = [...new Set(held.flatMap((r) => r.permissions))];
  const usesContent = permissions.includes("content.edit") && !person.roles.includes("Super admin");
  const words = roleWords(permissions);
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <div className="flex flex-col gap-3">
        <Link href="/admin/users/roles" className="inline-flex items-center gap-1 self-start type-label text-secondary">
          <Icon name="arrow-left" size={16} />
          Team and roles
        </Link>
        <div className="flex items-center gap-3">
          <Initials name={person.name || person.email} size="lg" photoUrl={photos.get(person.userId)} />
          <div className="flex flex-col gap-1">
            <h1 className="type-h2">{person.name || person.email}</h1>
            <p className="type-body-sm text-secondary">
              {person.email} · {person.roles.join(", ")} · last active{" "}
              {person.lastActive ? formatIstDateTime(person.lastActive) : "not yet"}
            </p>
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-2 rounded-card border border-default bg-mint p-5">
        <h2 className="type-h4">What they can do</h2>
        <p className="type-body-sm">{words.can.join(" · ") || "Nothing"}</p>
        <p className="type-caption text-secondary">Can&apos;t open: {words.cannot.join(", ") || "nothing is closed"}</p>
      </section>
      <PersonAccess
        userId={person.userId}
        roles={person.roles}
        usesContent={usesContent}
        sections={CONTENT_SECTIONS.map((s) => ({ id: s.id, label: s.label, description: s.description }))}
        current={person.sections}
        canManage={actor.operator.has("roles.manage")}
      />
    </AdminShell>
  );
}
