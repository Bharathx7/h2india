import { OPERATOR_ACTIONS, OPERATOR_AREAS, SENSITIVE_AREAS, SUPER_ADMIN_ONLY } from "@h2india/core/authz/rules";

// Roles in plain words (founder, 20 Nov 2026: the roles screen must be easy): what a role can and can't do, by area,
// for the role cards in Add a team member and the role editor's live summary. Pure, so it's unit-tested.

export const AREA_LABEL: Record<string, string> = {
  overview: "Overview",
  queues: "Queues",
  content: "Content",
  catalogue: "Catalogue",
  verification: "Verification",
  orders: "Orders",
  money: "Money",
  users: "Users",
  compliance: "Compliance",
  reports: "Reports",
  settings: "System settings",
};

const VERB: Record<string, string> = { view: "see", edit: "change", delete: "delete", export: "export" };

export const EXTRA_LABEL: Record<string, string> = {
  "content.publish": "Publish and schedule content",
  "roles.manage": "Manage the team and roles",
  "content.purge": "Delete content permanently",
};

export function roleWords(permissions: readonly string[]): { can: string[]; cannot: string[] } {
  const has = new Set(permissions);
  const can: string[] = [];
  const cannot: string[] = [];
  for (const area of OPERATOR_AREAS) {
    const verbs = OPERATOR_ACTIONS.filter((a) => has.has(`${area}.${a}`)).map((a) => VERB[a]);
    if (verbs.length) can.push(`${AREA_LABEL[area] ?? area}: ${verbs.join(", ")}`);
    else cannot.push(AREA_LABEL[area] ?? area);
  }
  for (const [key, label] of Object.entries(EXTRA_LABEL)) if (has.has(key)) can.push(label);
  return { can, cannot };
}

/** Keys that need Confirm it's you when given: more than View in a sensitive area, or Super admin-only ones. */
export function isSensitive(key: string): boolean {
  if (SUPER_ADMIN_ONLY.includes(key)) return true;
  const [area, action] = key.split(".");
  return (SENSITIVE_AREAS as readonly string[]).includes(area ?? "") && action !== "view";
}

export function roleIsSensitive(permissions: readonly string[]): boolean {
  return permissions.some(isSensitive);
}
