import { getDb } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import { buyerOf, type BuyerContext } from "@h2india/core/buyer";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { isEnabled } from "@h2india/config";
import { buttonClasses, Icon, type WorkspaceNavGroup } from "@h2india/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";

// The buyer workspace (Figma page 13, Stage 9): Workspace sidebar v2, buyer variant, with Request a quote in the top
// bar. Orders and payments are left out while transactions are off.

export interface BuyerPage {
  userId: string;
  actor: Actor;
  buyer: BuyerContext;
}

export async function requireBuyer(path: string): Promise<BuyerPage> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const buyer = await buyerOf(db, actor);
  if (!buyer) redirect("/join");
  return { userId: session.user.id, actor, buyer };
}

function nav(): WorkspaceNavGroup[] {
  const money = isEnabled("transactions");
  return WORKSPACE_NAV.buyer.map((g) => ({
    ...g,
    items: g.items.filter((i) => money || (i.href !== "/buyer/orders" && i.href !== "/buyer/payments")),
  }));
}

export async function BuyerWorkspace({
  page,
  current,
  children,
}: {
  page: BuyerPage;
  current: string;
  children: ReactNode;
}) {
  const db = getDb();
  const [shell, unread, bell] = await Promise.all([
    shellFor(page.userId),
    unreadCount(db, page.userId),
    listNotifications(db, page.userId, { limit: 5 }),
  ]);
  return (
    <WorkspaceFrame
      area="buyer"
      groups={nav()}
      current={current}
      user={{ ...shell.user, role: page.buyer.legalName }}
      welcome={shell.welcome}
      home="/buyer"
      bell={{ unread, items: toRows(bell) }}
      searchPlaceholder="Search products, suppliers or specs"
      action={
        <Link href="/rfq/new" className={buttonClasses({})}>
          Request a quote
          <Icon name="arrow-right" size={18} />
        </Link>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>
    </WorkspaceFrame>
  );
}
