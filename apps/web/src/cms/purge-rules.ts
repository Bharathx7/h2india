import { isArchivable } from "./archive";

// Delete permanently (founder, 19 Nov 2026, A197): only a Super admin (content.purge), with a reason and the record's
// name typed to confirm, audited with what was deleted. Each content type needs one condition first, so nothing is
// deleted by accident or while the site still uses it. Pure: unit-tested.

export type PurgeRule =
  /** Archived first (it has already left the site), then deleted from the Archived list. */
  | "archived"
  /** Not on the site right now (unpublished or never published). */
  | "unpublished"
  /** Never published: a published version must stay on record (legal pages, newsletter issues). */
  | "never-published"
  /** Nothing links to it (authors, topics, tags, pictures and files). */
  | "unused";

/** Content types that can't be deleted: records of what readers sent and what the system saw. */
export const NEVER_PURGED: readonly string[] = [
  "corrections",
  "source-changes",
  "submissions",
  "report-leads",
  "tracker-changes",
  "editors",
];

const RULES: Record<string, PurgeRule> = {
  articles: "unpublished",
  "legal-pages": "never-published",
  "newsletter-issues": "never-published",
  authors: "unused",
  topics: "unused",
  tags: "unused",
  media: "unused",
  "media-files": "unused",
  "report-files": "unused",
};

/** The condition a record of this type must meet before it can be deleted, or null when it never can. */
export function purgeRule(slug: string): PurgeRule | null {
  if (NEVER_PURGED.includes(slug)) return null;
  if (isArchivable(slug)) return "archived";
  return RULES[slug] ?? null;
}

export interface PurgeFacts {
  archived: boolean;
  /** Published on the site right now. */
  published: boolean;
  /** Published at any time (it has a published version). */
  everPublished: boolean;
  /** How many records link to it. */
  usedBy: number;
}

/** Why it can't be deleted yet, in words for the Super admin; null when it can. */
export function purgeBlocker(rule: PurgeRule | null, facts: PurgeFacts): string | null {
  switch (rule) {
    case null:
      return "This kind of content is kept on record and can't be deleted.";
    case "archived":
      return facts.archived ? null : "Archive it first. Deleting permanently is done from the Archived list.";
    case "unpublished":
      return facts.published ? "Unpublish it first." : null;
    case "never-published":
      return facts.everPublished ? "It has been published, so it stays on record." : null;
    case "unused":
      return facts.usedBy > 0
        ? `It's still used by ${facts.usedBy.toLocaleString("en-IN")} ${facts.usedBy === 1 ? "record" : "records"}. Remove it from them first.`
        : null;
  }
}

/** The confirmation must be the record's name exactly (spaces at the ends and letter case ignored). */
export function confirmsName(typed: string, name: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(name) !== "" && norm(typed) === norm(name);
}

/** The ids of pictures and files placed inside a rich-text value (Payload upload nodes). */
export function uploadsIn(value: unknown, relationTo: string): number[] {
  const out: number[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    const node = n as { type?: unknown; relationTo?: unknown; value?: unknown; children?: unknown; root?: unknown };
    if (node.type === "upload" && node.relationTo === relationTo) {
      const v = node.value;
      const id = typeof v === "number" ? v : v && typeof v === "object" ? (v as { id?: unknown }).id : null;
      if (typeof id === "number") out.push(id);
    }
    walk(node.root);
    walk(node.children);
  };
  walk(value);
  return out;
}
