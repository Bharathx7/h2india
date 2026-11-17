import config from "@payload-config";
import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { adminAreas, adminCounts } from "@h2india/core/admin";
import { identityOf, loadActor } from "@h2india/core/authz";
import { isMember, MEMBER_JOIN_PATH } from "@h2india/core/members";
import type { WorkspaceArea, WorkspaceNavGroup, WorkspaceUser } from "@h2india/ui";
import { getPayload } from "payload";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";

// The workspace shell for a signed-in person (Workspace sidebar and top bar v2, 194:1190 and 194:1191).

/** Pages that exist only while ordering is on (transactions); hidden from the menu otherwise. */
const MONEY_PAGES = new Set(["/buyer/orders", "/buyer/payments", "/supplier/orders"]);

/**
 * The sidebar for an area, as every page of that area shows it (founder QC, 17 Nov 2026: Account, Notifications and
 * the admin pages that draw their own frame showed the unfiltered menu). Money pages only with transactions on; the
 * back office only the areas the operator may open, with their waiting counts.
 */
export async function navFor(area: WorkspaceArea, userId: string): Promise<WorkspaceNavGroup[]> {
  if (area !== "admin") {
    const money = isEnabled("transactions");
    return WORKSPACE_NAV[area]
      .map((g) => ({ ...g, items: g.items.filter((i) => money || !MONEY_PAGES.has(i.href)) }))
      .filter((g) => g.items.length);
  }
  const db = getDb();
  const [actor, core, cms] = await Promise.all([loadActor(db, userId), adminCounts(db), cmsQueueCount()]);
  const counts: Partial<Record<string, number>> = { ...core, queues: (core.queues ?? 0) + cms };
  const areas = adminAreas(actor);
  const key = (href: string) => (href === "/admin" ? "overview" : href.split("/")[2]) as keyof typeof areas;
  return WORKSPACE_NAV.admin
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => areas[key(i.href)]).map((i) => ({ ...i, count: counts[key(i.href)] || undefined })),
    }))
    .filter((g) => g.items.length);
}

export async function shellFor(userId: string) {
  const [who, member] = await Promise.all([identityOf(getDb(), userId), isMember(getDb(), userId)]);
  const name = who.name || who.email || "You";
  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const role =
    who.area === "admin" ? "H2 Economy operator" : who.area === "member" ? "Member" : (who.company ?? "Company");
  const user: WorkspaceUser = { name, role, initials };
  return {
    area: who.area,
    user,
    groups: await navFor(who.area, userId),
    home: `/${who.area}`,
    email: who.email,
    mobile: who.mobile,
    member,
    /**
     * The other place this person can go from the profile menu (founder QC, 17 Nov 2026): a buyer or supplier who is
     * also a member switches to the member area and back; one who isn't is offered Join as member.
     */
    switchTo:
      who.area === "buyer" || who.area === "supplier"
        ? member
          ? { label: "Member area", href: "/member" }
          : { label: "Join as member", href: MEMBER_JOIN_PATH }
        : null,
  };
}

/** From the member area back to a buyer's or supplier's own workspace. */
export function backToWorkspace(area: WorkspaceArea): { label: string; href: string } | null {
  return area === "buyer"
    ? { label: "Buyer workspace", href: "/buyer" }
    : area === "supplier"
      ? { label: "Supplier workspace", href: "/supplier" }
      : null;
}

/**
 * Queue items that live in the CMS (content, events, jobs, inbox), for the sidebar's Queues count: every submission
 * under review and every job sent for review, so the count is the sum of the queue tabs (founder QC, 17 Nov 2026).
 */
async function cmsQueueCount(): Promise<number> {
  try {
    const payload = await getPayload({ config });
    const [subs, jobs] = await Promise.all([
      payload.count({ collection: "submissions", where: { status: { equals: "Under review" } }, overrideAccess: true }),
      payload.find({
        collection: "jobs",
        where: { "post.state": { equals: "Submitted for review" } },
        draft: true,
        depth: 0,
        limit: 1,
        overrideAccess: true,
      }),
    ]);
    return subs.totalDocs + jobs.totalDocs;
  } catch (error) {
    // A count is never worth a broken page.
    console.error("queue count failed", error);
    return 0;
  }
}
