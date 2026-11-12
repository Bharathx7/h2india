import config from "@payload-config";
import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { identityOf } from "@h2india/core/authz";
import { unreadCount } from "@h2india/core/notify";
import type { SiteUser } from "@h2india/ui";
import { getPayload } from "payload";
import { cache } from "react";
import { LAUNCH_LINE } from "@/cms/home/collections";
import { getSession } from "./auth";

// The person looking at a public page (step 5.1): the header's signed-in state, the home greeting, and whether the
// Coming soon page stands in front of the site (A44: signed-in operators and the allow-list see the real site).

const WORKSPACE: Record<string, string> = { admin: "Admin", buyer: "Buyer", supplier: "Supplier", member: "Member" };

export interface Viewer {
  user: SiteUser;
  firstName: string;
  email: string;
  operator: boolean;
}

export const siteViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession().catch(() => null);
  if (!session) return null;
  const db = getDb();
  const [who, unread] = await Promise.all([identityOf(db, session.user.id), unreadCount(db, session.user.id)]);
  const name = who.name || who.email || "You";
  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return {
    user: {
      name,
      initials,
      organisation: who.company ?? (who.area === "admin" ? "H2 India" : ""),
      workspace: WORKSPACE[who.area] ?? "Member",
      workspaceHref: `/${who.area}`,
      unread,
    },
    // Someone who hasn't joined yet has no name: the greeting is then just "For you".
    firstName: who.name ? (who.name.split(/\s+/)[0] ?? "") : "",
    email: who.email.toLowerCase(),
    operator: who.area === "admin",
  };
});

export interface Prelaunch {
  launchLine: string;
  allowList: string[];
}

export const prelaunchSettings = cache(async (): Promise<Prelaunch> => {
  const doc = await (await getPayload({ config })).findGlobal({ slug: "prelaunch", depth: 0 });
  return {
    launchLine: doc.launchLine || LAUNCH_LINE,
    allowList: (doc.allowList ?? []).map((a) => a.email.trim().toLowerCase()),
  };
});

/** With the comingSoon flag on, everyone sees the pre-launch page except signed-in operators and the allow-list. */
export async function comingSoonFor(viewer: Viewer | null): Promise<Prelaunch | null> {
  if (!isEnabled("comingSoon")) return null;
  const settings = await prelaunchSettings();
  if (viewer && (viewer.operator || settings.allowList.includes(viewer.email))) return null;
  return settings;
}
