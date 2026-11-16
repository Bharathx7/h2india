import { getDb } from "@h2india/core";
import { identityOf } from "@h2india/core/authz";
import type { WorkspaceUser } from "@h2india/ui";
import { WORKSPACE_NAV } from "@/lib/workspace-nav";

// The workspace shell for a signed-in person (Workspace sidebar and top bar v2, 194:1190 and 194:1191).

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
    welcome: `Welcome, ${words[0] ?? name}`,
    groups: WORKSPACE_NAV[who.area],
    home: `/${who.area}`,
    email: who.email,
    mobile: who.mobile,
  };
}
