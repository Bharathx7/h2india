import { getDb } from "@h2india/core";
import { adminAreas, adminCounts } from "@h2india/core/admin";
import { can, loadActor, type Actor, type Permission } from "@h2india/core/authz";
import { buttonClasses, Icon, Logo, type WorkspaceNavGroup } from "@h2india/ui";
import Link from "next/link";
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
  const [shell, unread, bell, actor, counts] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 5 }),
    loadActor(db, userId),
    adminCounts(db),
  ]);
  const areas = adminAreas(actor);
  const key = (href: string) => (href === "/admin" ? "overview" : href.split("/")[2]) as keyof typeof areas;
  const groups: WorkspaceNavGroup[] = WORKSPACE_NAV.admin
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => areas[key(i.href)]).map((i) => ({ ...i, count: counts[key(i.href)] || undefined })),
    }))
    .filter((g) => g.items.length);
  return (
    <WorkspaceFrame
      area="admin"
      groups={groups}
      current={current}
      user={shell.user}
      welcome={title}
      home="/admin"
      bell={{ unread, items: toRows(bell) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>
      <LargerScreen />
    </WorkspaceFrame>
  );
}

/** Use a larger screen (627:1001): the back office needs at least 1024 px; below that this covers the page. */
function LargerScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-page p-8 text-center lg:hidden">
      <Logo height={36} />
      <span className="flex size-16 items-center justify-center rounded-pill bg-mint">
        <Icon name="layout-dashboard" size={28} />
      </span>
      <h1 className="type-h3">Use a larger screen</h1>
      <p className="type-body text-body">
        The H2 India back office needs a screen at least 1024 px wide. Open it on a laptop or desktop.
      </p>
      <Link href="/" className={buttonClasses({ variant: "outline" })}>
        Go to H2 India home
      </Link>
    </div>
  );
}
