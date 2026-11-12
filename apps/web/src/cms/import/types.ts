import type { CollectionSlug } from "payload";

// What can be imported (step 4.6): the playbook's types plus the other records, the standards library and the tracker.
// `publishable` follows who publishes (A30, A39): records, glossary, standards and tracker rows may carry publish=yes;
// articles always import as drafts for the Editor-in-chief's workflow.

export interface ContentImportType {
  collection: CollectionSlug;
  /** The field a missing slug is made from. */
  titleField: string;
  publishable: boolean;
}

export const CONTENT_TYPES = {
  glossary: { collection: "glossary", titleField: "term", publishable: true },
  articles: { collection: "articles", titleField: "title", publishable: false },
  guides: { collection: "guides", titleField: "title", publishable: false },
  schemes: { collection: "schemes", titleField: "name", publishable: true },
  tenders: { collection: "tenders", titleField: "title", publishable: true },
  events: { collection: "events", titleField: "name", publishable: true },
  grants: { collection: "grants", titleField: "title", publishable: true },
  jobs: { collection: "jobs", titleField: "role", publishable: true },
  standards: { collection: "standards", titleField: "code", publishable: true },
  "tracker-projects": { collection: "tracker-projects", titleField: "name", publishable: true },
  "tracker-factories": { collection: "tracker-factories", titleField: "name", publishable: true },
  "tracker-pilots": { collection: "tracker-pilots", titleField: "name", publishable: true },
  "tracker-stations": { collection: "tracker-stations", titleField: "name", publishable: true },
  "tracker-prices": { collection: "tracker-prices", titleField: "name", publishable: true },
  "tracker-policies": { collection: "tracker-policies", titleField: "name", publishable: true },
  "tracker-hubs": { collection: "tracker-hubs", titleField: "name", publishable: true },
} as const satisfies Record<string, ContentImportType>;

export type ContentTypeName = keyof typeof CONTENT_TYPES;
export const IMPORT_TYPE_NAMES = [...Object.keys(CONTENT_TYPES), "companies"] as const;

/** Columns every content file may have besides the collection's fields. */
export const CONTROL_COLUMNS = ["slug", "publish"] as const;
