import { getDb } from "@h2india/core";
import { listFollows } from "@h2india/core/members";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { EmptyState } from "@h2india/ui";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";
import { shellFor } from "@/server/workspace";
import { toRows } from "../../(workspace)/notifications/rows";

// Member home (step 7.1 interim): the workspace shell and what the member follows. The feed itself is step 7.2.
export async function MemberHome({ userId }: { userId: string; searchParams: Promise<{ state?: string }> }) {
  const db = getDb();
  const [shell, unread, bell, follows] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 5 }),
    listFollows(db, userId),
  ]);
  return (
    <WorkspaceFrame
      area="member"
      groups={WORKSPACE_NAV.member}
      current="/member"
      user={shell.user}
      welcome={shell.welcome}
      home="/member"
      bell={{ unread, items: toRows(bell) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <h1 className="type-h2">Home</h1>
        {follows.length ? (
          <p className="type-body text-body">You follow {follows.map((f) => f.label).join(", ")}.</p>
        ) : (
          <EmptyState title="Your feed is empty">Follow topics, companies and states to fill it.</EmptyState>
        )}
      </div>
    </WorkspaceFrame>
  );
}
