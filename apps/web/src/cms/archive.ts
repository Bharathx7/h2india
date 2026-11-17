import type { CollectionConfig } from "payload";

// Archive (founder QC, 17 Nov 2026): content records can be archived from the back office and restored later.
// Payload's trash keeps the record with a deletedAt date; every normal read (the public site, search builders, lists)
// leaves it out, and nothing is deleted. Left out on purpose:
// - legal pages and newsletter issues: published versions must stay on record;
// - authors, topics and tags: archiving one would quietly strip it from every article that uses it;
// - media and files: archiving one would break the images and downloads that use it.
export const ARCHIVABLE_SLUGS: readonly string[] = [
  "schemes",
  "tenders",
  "grants",
  "jobs",
  "events",
  "tracker-projects",
  "tracker-factories",
  "tracker-pilots",
  "tracker-stations",
  "tracker-prices",
  "tracker-policies",
  "tracker-hubs",
  "chapters",
  "guides",
  "glossary",
  "standards",
  "reports",
  "videos",
  "podcasts",
  "people",
  "associations",
  "help-articles",
  "team-members",
  "application-pages",
  "early-listings",
];

export const isArchivable = (slug: string) => ARCHIVABLE_SLUGS.includes(slug);

/** Turns on Payload's trash for the archivable collections. */
export function withArchive(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((c) => (isArchivable(c.slug) ? { ...c, trash: true } : c));
}
