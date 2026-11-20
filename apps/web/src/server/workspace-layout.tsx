import { getDb } from "@h2india/core";
import { isEnabled } from "@h2india/config";
import { loadActor } from "@h2india/core/authz";
import { buyerOf } from "@h2india/core/buyer";
import { mayUseMemberFeatures, membershipFacts } from "@h2india/core/members";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { supplierOf } from "@h2india/core/supplier";
import { buttonClasses, Icon } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { LargerScreen } from "@/admin/shell";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { getSession, operatorSession, staffSignedIn } from "@/server/auth";
import { backToWorkspace, navFor, shellFor } from "@/server/workspace";

// The workspace frame (sidebar, top bar, bell, profile) in each workspace's layout (founder, 20 Nov 2026: a sidebar
// click reloaded the whole page). A layout stays on screen while its pages change, so a click swaps only the page
// and the frame's queries (counts, bell, profile) run once, not on every page. The sidebar marks the open page from
// the address. Each page still checks its own access (requireOperator, requireSupplier, …) and redirects; for
// someone the frame isn't for, the layout shows the page alone so that redirect can happen.

async function bellFor(userId: string) {
  const db = getDb();
  const [unread, items] = await Promise.all([unreadCount(db, userId), listNotifications(db, userId, { limit: 5 })]);
  return { unread, items: toRows(items) };
}

export async function AdminFrame({ children }: { children: ReactNode }) {
  const session = await operatorSession();
  if (!session) return children;
  const actor = await loadActor(getDb(), session.user.id);
  if (actor.operator.size === 0) return children;
  if (isEnabled("operatorPassword") && !(await staffSignedIn())) return children;
  const [shell, bell, groups] = await Promise.all([
    shellFor(session.user.id),
    bellFor(session.user.id),
    navFor("admin", session.user.id),
  ]);
  return (
    <WorkspaceFrame area="admin" groups={groups} user={shell.user} home="/admin" bell={bell}>
      {children}
      <LargerScreen />
    </WorkspaceFrame>
  );
}

export async function SupplierFrame({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const db = getDb();
  const supplier = await supplierOf(db, await loadActor(db, session.user.id));
  if (!supplier) return children;
  const [shell, bell, groups] = await Promise.all([
    shellFor(session.user.id),
    bellFor(session.user.id),
    navFor("supplier", session.user.id),
  ]);
  return (
    <WorkspaceFrame
      area="supplier"
      groups={groups}
      user={{ ...shell.user, role: supplier.tradeName }}
      home="/supplier"
      bell={bell}
      switchTo={shell.switchTo}
      action={
        supplier.seat.permissions.has("product.manage") ? (
          <Link href="/supplier/products/new" className={buttonClasses({})}>
            <Icon name="plus" size={18} />
            Add product
          </Link>
        ) : null
      }
    >
      {children}
    </WorkspaceFrame>
  );
}

export async function BuyerFrame({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const db = getDb();
  const buyer = await buyerOf(db, await loadActor(db, session.user.id));
  if (!buyer) return children;
  const [shell, bell, groups] = await Promise.all([
    shellFor(session.user.id),
    bellFor(session.user.id),
    navFor("buyer", session.user.id),
  ]);
  return (
    <WorkspaceFrame
      area="buyer"
      groups={groups}
      user={{ ...shell.user, role: buyer.legalName }}
      home="/buyer"
      bell={bell}
      switchTo={shell.switchTo}
      action={
        <Link href="/rfq/new" className={buttonClasses({})}>
          Request a quote
          <Icon name="arrow-right" size={18} />
        </Link>
      }
    >
      {children}
    </WorkspaceFrame>
  );
}

/**
 * The member area. Members (and staff) get the member sidebar, with a way back to a buyer's or supplier's own
 * workspace; a buyer or supplier who hasn't joined yet (Join as member) sees their own workspace's sidebar.
 */
export async function MemberFrame({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const db = getDb();
  const userId = session.user.id;
  const [shell, bell, facts] = await Promise.all([shellFor(userId), bellFor(userId), membershipFacts(db, userId)]);
  if (!facts.profileType && shell.area === "member") return children;
  const member = mayUseMemberFeatures(facts);
  return (
    <WorkspaceFrame
      area={member ? "member" : shell.area}
      groups={member ? (shell.area === "member" ? shell.groups : await navFor("member", userId)) : shell.groups}
      user={shell.user}
      home={member ? "/member" : shell.home}
      bell={bell}
      switchTo={member ? (shell.area === "member" ? shell.switchTo : backToWorkspace(shell.area)) : null}
    >
      {children}
    </WorkspaceFrame>
  );
}

/** Account and Notifications: the person's own workspace frame. */
export async function OwnFrame({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const [shell, bell] = await Promise.all([shellFor(session.user.id), bellFor(session.user.id)]);
  return (
    <WorkspaceFrame
      area={shell.area}
      groups={shell.groups}
      user={shell.user}
      home={shell.home}
      bell={bell}
      switchTo={shell.switchTo}
    >
      {children}
    </WorkspaceFrame>
  );
}
