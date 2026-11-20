import { getDb } from "@h2india/core";
import { mayUseMember, memberJoinHref } from "@h2india/core/members";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/server/auth";

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

/**
 * A member page's content area. The frame (sidebar, top bar) is drawn once by the member layout (MemberFrame,
 * founder 20 Nov 2026), so a sidebar click swaps only this part.
 */
export function MemberShell({ children }: { userId?: string; current?: string; children: ReactNode }) {
  return <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>;
}
