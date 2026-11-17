import { getDb } from "@h2india/core";
import { isEnabled } from "@h2india/config";
import { can, hasOperatorRole, loadActor, type Actor, type Permission } from "@h2india/core/authz";
import { buttonClasses, Icon, Logo } from "@h2india/ui";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { operatorSession, staffSignedIn } from "@/server/auth";
import { navFor, shellFor } from "@/server/workspace";
import { absolute } from "@/seo/site";

// The admin back office shell (Figma page 15) for operator screens. Without the permission the page is a plain 404,
// so its existence isn't revealed.

export async function requireOperator(permission: Permission, path: string): Promise<{ userId: string; actor: Actor }> {
  // The operator's own session: admin screens never take on a viewed person (step 11.4).
  const session = await operatorSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  // The back office needs the staff password sign-in (A183, review H2): an operator signed in any other way (an email
  // code on the public site) signs in again with their password.
  if (isEnabled("operatorPassword") && !(await staffSignedIn()) && (await hasOperatorRole(getDb(), session.user.id)))
    redirect(`/sign-in/staff?next=${encodeURIComponent(path)}`);
  const actor = await loadActor(getDb(), session.user.id);
  if (!can(actor, permission)) notFound();
  return { userId: session.user.id, actor };
}

export async function AdminShell({
  userId,
  current,
  children,
}: {
  userId: string;
  current: string;
  /** The page's name ("Catalogue"). The top bar no longer shows it (founder QC, 17 Nov 2026); pages show their own h1. */
  title?: string;
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
      groups={await navFor("admin", userId)}
      current={current}
      user={shell.user}
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
        The H2 Economy back office needs a screen at least 1024 px wide. Open it on a laptop or desktop.
      </p>
      {/* The public home is on the other domain; "/" on the admin domain is this page again (founder QC, 17 Nov 2026). */}
      <a href={absolute("/")} className={buttonClasses({ variant: "outline" })}>
        Go to H2 Economy home
      </a>
    </div>
  );
}
