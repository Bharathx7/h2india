import { getDb } from "@h2india/core";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";

/** The signed-in member, or a trip to sign in that comes back here. */
export async function requireMember(path: string): Promise<string> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  return session.user.id;
}

/** The member workspace shell (Workspace sidebar and top bar v2) around a page (Figma page 12). */
export async function MemberShell({
  userId,
  current,
  children,
}: {
  userId: string;
  current: string;
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
      area="member"
      groups={WORKSPACE_NAV.member}
      current={current}
      user={shell.user}
      welcome={shell.welcome}
      home="/member"
      bell={{ unread, items: toRows(bell) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>
    </WorkspaceFrame>
  );
}
