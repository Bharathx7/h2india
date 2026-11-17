import { getDb } from "@h2india/core";
import { mayUseMember, memberJoinHref } from "@h2india/core/members";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { getSession } from "@/server/auth";
import { backToWorkspace, navFor, shellFor } from "@/server/workspace";

/**
 * The signed-in member, or a trip to sign in that comes back here. Founder QC (17 Nov 2026): the member area is for
 * members only; a buyer or supplier who hasn't joined as a member goes to Join as member and comes back afterwards,
 * with the page's query (a Save or Follow from a public page) kept. Staff may open it too.
 */
export async function requireMember(
  path: string,
  query: Record<string, string | string[] | undefined> = {},
): Promise<string> {
  const q = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v] as [string, string]] : [])),
  ).toString();
  const back = q ? `${path}?${q}` : path;
  const session = await getSession();
  if (!session) redirect(`/member/sign-in?next=${encodeURIComponent(back)}`);
  if (!(await mayUseMember(getDb(), session.user.id))) redirect(memberJoinHref(back));
  return session.user.id;
}

/** The member workspace shell (Workspace sidebar and top bar v2) around a page (Figma page 12). */
export function MemberShell(props: { userId: string; current: string; children: ReactNode }) {
  return <WorkspaceShell area="member" {...props} />;
}

/** The same shell for the buyer workspace (Figma page 13), used by buyer Alerts (79:3425) until Stage 9. */
export function BuyerShell(props: { userId: string; current: string; children: ReactNode }) {
  return <WorkspaceShell area="buyer" {...props} />;
}

async function WorkspaceShell({
  area,
  userId,
  current,
  children,
}: {
  area: "member" | "buyer";
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
      area={area}
      groups={shell.area === area ? shell.groups : await navFor(area, userId)}
      current={current}
      user={shell.user}
      home={`/${area}`}
      bell={{ unread, items: toRows(bell) }}
      // A buyer or supplier who is also a member goes back to their own workspace from here, and the other way.
      switchTo={shell.area === area ? shell.switchTo : area === "member" ? backToWorkspace(shell.area) : null}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>
    </WorkspaceFrame>
  );
}
