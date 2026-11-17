import { getDb } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import { buyerOf, type BuyerContext } from "@h2india/core/buyer";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { buttonClasses, Icon } from "@h2india/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { getSession } from "@/server/auth";
import { navFor, shellFor } from "@/server/workspace";

// The buyer workspace (Figma page 13, Stage 9): Workspace sidebar v2, buyer variant, with Request a quote in the top
// bar. Orders and payments are left out while transactions are off.

export interface BuyerPage {
  userId: string;
  actor: Actor;
  buyer: BuyerContext;
}

export async function requireBuyer(path: string): Promise<BuyerPage> {
  const session = await getSession();
  if (!session) redirect(`/buyer/sign-in?next=${encodeURIComponent(path)}`);
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const buyer = await buyerOf(db, actor);
  if (!buyer) redirect("/join/buyer");
  return { userId: session.user.id, actor, buyer };
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
      groups={await navFor("buyer", page.userId)}
      current={current}
      user={{ ...shell.user, role: page.buyer.legalName }}
      home="/buyer"
      bell={{ unread, items: toRows(bell) }}
      switchTo={shell.switchTo}
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
