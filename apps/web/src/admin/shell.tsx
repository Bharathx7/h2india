import { getDb } from "@h2india/core";
import { can, loadActor, type Actor, type Permission } from "@h2india/core/authz";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";

// The admin back office shell (Figma page 15) for operator screens. Without the permission the page is a plain 404,
// so its existence isn't revealed.

export async function requireOperator(permission: Permission, path: string): Promise<{ userId: string; actor: Actor }> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  const actor = await loadActor(getDb(), session.user.id);
  if (!can(actor, permission)) notFound();
  return { userId: session.user.id, actor };
}

export async function AdminShell({
  userId,
  current,
  title,
  children,
}: {
  userId: string;
  current: string;
  title: string;
  children: ReactNode;
}) {
  const db = getDb();
  const [shell, unread, bell] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 5 }),
  ]);
  return (
    <WorkspaceFrame
      area="admin"
      groups={WORKSPACE_NAV.admin}
      current={current}
      user={shell.user}
      welcome={title}
      home="/admin"
      bell={{ unread, items: toRows(bell) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>
    </WorkspaceFrame>
  );
}
