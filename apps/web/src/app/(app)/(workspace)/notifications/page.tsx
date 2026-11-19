import { getDb } from "@h2india/core";
import { mobileFieldsShown } from "@h2india/core/admin/system";
import { getChoices, listNotifications, unreadCount } from "@h2india/core/notify";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { pageRequest, pagingQuery } from "@/lib/paging";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";
import { NotificationsView } from "./NotificationsView";
import { toRows } from "./rows";

// Notification centre (97:2564; phones 100:4631; empty, loading and error 128:23533, 128:23553, 128:23576).
export const metadata: Metadata = { title: "Notifications · H2 Economy", robots: { index: false } };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; state?: string; page?: string; perPage?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/notifications");
  const sp = await searchParams;
  const { tab, state } = sp;
  const db = getDb();
  const userId = session.user.id;
  const [shell, unread, items, choices, showMobile] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 100 }),
    getChoices(db, userId),
    mobileFieldsShown(db),
  ]);
  const rows = toRows(items);
  // ?state= shows the designed loading, empty and error states in development (playbook step 2.5).
  const demo = process.env.NODE_ENV !== "production" || process.env.FLAG_DEV_PAGES === "true" ? state : undefined;
  return (
    <WorkspaceFrame
      area={shell.area}
      groups={shell.groups}
      current="/notifications"
      user={shell.user}
      home={shell.home}
      bell={{ unread, items: rows.slice(0, 5) }}
    >
      <NotificationsView
        area={shell.area}
        initial={{ unread, items: rows }}
        tab={tab === "email" ? "email" : "activity"}
        demoState={demo === "loading" || demo === "empty" || demo === "error" ? demo : undefined}
        choices={choices}
        contact={{ email: shell.email, mobile: shell.mobile, whatsapp: showMobile }}
        paging={pageRequest(sp)}
        query={pagingQuery(sp)}
      />
    </WorkspaceFrame>
  );
}
