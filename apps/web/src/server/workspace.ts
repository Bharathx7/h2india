import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { adminAreas, adminCounts } from "@h2india/core/admin";
import { identityOf, loadActor } from "@h2india/core/authz";
import type { WorkspaceArea, WorkspaceNavGroup, WorkspaceUser } from "@h2india/ui";
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
  const [actor, counts] = await Promise.all([loadActor(db, userId), adminCounts(db)]);
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
  const who = await identityOf(getDb(), userId);
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
  };
}
