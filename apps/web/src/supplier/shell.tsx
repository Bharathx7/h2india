import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { supplierOf, type SupplierContext } from "@h2india/core/supplier";
import { buttonClasses, Icon, type WorkspaceNavGroup } from "@h2india/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";

// The supplier workspace (Figma page 14, Stage 8): Workspace sidebar v2, supplier variant (Catalogue, Selling,
// Business, Company), with Add product in the top bar. Orders are left out while transactions are off.

export interface SupplierPage {
  userId: string;
  actor: Actor;
  supplier: SupplierContext;
}

/** The signed-in person and their supplier company; anyone else is sent to sign in or to join as a supplier. */
export async function requireSupplier(path: string): Promise<SupplierPage> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  if (!supplier) redirect("/for-suppliers");
  return { userId: session.user.id, actor, supplier };
}

function nav(): WorkspaceNavGroup[] {
  const orders = isEnabled("transactions");
  return WORKSPACE_NAV.supplier.map((g) => ({
    ...g,
    items: g.items.filter((i) => orders || i.href !== "/supplier/orders"),
  }));
}

export async function SupplierShell({
  page,
  current,
  title,
  children,
}: {
  page: SupplierPage;
  current: string;
  /** The top bar title, for example "Getting started" or "Dashboard". */
  title: string;
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
      area="supplier"
      groups={nav()}
      current={current}
      user={{ ...shell.user, role: page.supplier.tradeName }}
      welcome={title}
      home="/supplier"
      bell={{ unread, items: toRows(bell) }}
      searchPlaceholder="Search RFQs, orders, products"
      action={
        page.supplier.seat.permissions.has("product.manage") ? (
          <Link href="/supplier/products/new" className={buttonClasses({})}>
            <Icon name="plus" size={18} />
            Add product
          </Link>
        ) : null
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>
    </WorkspaceFrame>
  );
}
