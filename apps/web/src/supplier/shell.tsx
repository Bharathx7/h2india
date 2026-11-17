import { getDb } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { suspensionOf } from "@h2india/core/admin/appeals";
import { supplierOf, type SupplierContext } from "@h2india/core/supplier";
import { buttonClasses, Icon } from "@h2india/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { SuspendedBanner } from "@/supplier/appeal/Banner";
import { getSession } from "@/server/auth";
import { navFor, shellFor } from "@/server/workspace";

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
  if (!session) redirect(`/supplier/sign-in?next=${encodeURIComponent(path)}`);
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  if (!supplier) redirect("/for-suppliers");
  return { userId: session.user.id, actor, supplier };
}

export async function SupplierShell({
  page,
  current,
  children,
}: {
  page: SupplierPage;
  current: string;
  /** The page's name ("Dashboard"). The top bar no longer shows it (founder QC, 17 Nov 2026); pages show their own h1. */
  title?: string;
  children: ReactNode;
}) {
  const db = getDb();
  const [shell, unread, bell, suspension] = await Promise.all([
    shellFor(page.userId),
    unreadCount(db, page.userId),
    listNotifications(db, page.userId, { limit: 5 }),
    suspensionOf(db, page.supplier.organisationId),
  ]);
  return (
    <WorkspaceFrame
      area="supplier"
      groups={await navFor("supplier", page.userId)}
      current={current}
      user={{ ...shell.user, role: page.supplier.tradeName }}
      home="/supplier"
      bell={{ unread, items: toRows(bell) }}
      switchTo={shell.switchTo}
      action={
        page.supplier.seat.permissions.has("product.manage") ? (
          <Link href="/supplier/products/new" className={buttonClasses({})}>
            <Icon name="plus" size={18} />
            Add product
          </Link>
        ) : null
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">
        {suspension ? (
          <SuspendedBanner
            reason={suspension.reason}
            appeal={suspension.appeal ? { status: suspension.appeal.status, note: suspension.appeal.note } : null}
            canAppeal={page.supplier.seat.permissions.has("company.manage")}
          />
        ) : null}
        {children}
      </div>
    </WorkspaceFrame>
  );
}
