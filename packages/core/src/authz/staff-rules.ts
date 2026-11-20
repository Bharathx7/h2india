import { OPERATOR_ACTIONS, OPERATOR_AREAS } from "./catalogue";

// Pure rules for team and roles (founder, 20 Nov 2026): the content sections an editor can be limited to, the
// permissions only a Super admin holds, and how a custom role's ticks are made whole. The database side is
// admin/staff.ts.

/** The content sections an editor can be limited to (the back office draws them from admin/cms/sections.ts). */
export const CONTENT_SECTION_IDS = [
  "articles",
  "opportunities",
  "events",
  "tracker",
  "knowledge",
  "newsletter",
  "newsroom",
  "directory",
  "site",
  "media",
  "inbox",
] as const;
export type ContentSectionId = (typeof CONTENT_SECTION_IDS)[number];

/** Permissions only a Super admin holds; a custom role never gets them. */
export const SUPER_ADMIN_ONLY: readonly string[] = ["roles.manage", "content.purge"];

export class StaffError extends Error {
  constructor(
    readonly code:
      | "BAD_EMAIL"
      | "BAD_NAME"
      | "NO_SUCH_ROLE"
      | "BAD_SECTIONS"
      | "BAD_PERMISSIONS"
      | "BUILT_IN"
      | "ROLE_IN_USE"
      | "NAME_TAKEN"
      | "CONFIRM",
    message: string,
  ) {
    super(message);
  }
}

/** A valid sections choice: null (all) or a non-empty list of known section ids, sorted, without repeats. */
export function cleanSections(sections: readonly string[] | null): string[] | null {
  if (sections === null) return null;
  const unique = [...new Set(sections)].sort();
  if (!unique.length) throw new StaffError("BAD_SECTIONS", "Pick at least one section, or choose All sections");
  for (const s of unique)
    if (!(CONTENT_SECTION_IDS as readonly string[]).includes(s))
      throw new StaffError("BAD_SECTIONS", `There is no content section "${s}"`);
  return unique;
}

/**
 * A role's permissions made whole: anything more than View in an area brings View; Publish brings Edit and View.
 * Pure, so the role editor shows the same set it saves.
 */
export function completePermissions(keys: readonly string[]): string[] {
  const out = new Set(keys);
  if (out.has("content.publish")) out.add("content.edit");
  for (const area of OPERATOR_AREAS)
    if (OPERATOR_ACTIONS.some((a) => a !== "view" && out.has(`${area}.${a}`))) out.add(`${area}.view`);
  return [...out].sort();
}
