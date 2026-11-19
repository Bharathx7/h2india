// The content the native back-office screens edit (step 4.6), grouped as the CMS groups it. Articles have their own
// editor (workflow); corrections, tracker changes, source changes, submissions, report leads and editors are written
// by the system or handled in their own queues, so they aren't here.

export const CONTENT_GROUPS = [
  { label: "Records", slugs: ["schemes", "tenders", "grants", "jobs", "events"] },
  {
    label: "India Hydrogen Tracker",
    slugs: [
      "tracker-projects",
      "tracker-factories",
      "tracker-pilots",
      "tracker-stations",
      "tracker-prices",
      "tracker-policies",
      "tracker-hubs",
    ],
  },
  { label: "Knowledge", slugs: ["chapters", "guides", "glossary", "standards", "reports", "videos", "podcasts"] },
  { label: "Newsroom", slugs: ["authors", "topics", "tags", "newsletter-issues"] },
  { label: "Directory", slugs: ["people", "associations"] },
  { label: "Site", slugs: ["legal-pages", "help-articles", "team-members", "application-pages", "early-listings"] },
  { label: "Files", slugs: ["media", "media-files", "report-files"] },
  // Moved here from the old /cms when it closed (founder, 19 Nov 2026: one CMS).
  {
    label: "Inbox and history",
    slugs: ["corrections", "source-changes", "submissions", "report-leads", "tracker-changes"],
  },
] as const;

export const CONTENT_SLUGS: readonly string[] = CONTENT_GROUPS.flatMap((g) => g.slugs);

/** Site-wide settings kept as single documents (Payload globals). */
export const SETTING_SLUGS: readonly string[] = [
  "home-figures",
  "trust-settings",
  "pricing",
  "audience-faqs",
  "maintenance",
  "tracker-overview",
  "tracker-methodology",
  "sight-tracker",
  "prelaunch",
];

/** Records the system or readers create: no New button. */
export const NO_CREATE_SLUGS: readonly string[] = [
  "corrections",
  "source-changes",
  "submissions",
  "report-leads",
  "tracker-changes",
];

/** Records nobody edits by hand: shown read-only (tracker changes are written by the publish hook; leads are kept as given). */
export const READ_ONLY_SLUGS: readonly string[] = ["report-leads", "tracker-changes"];

/** Records that carry "Last verified" (A30). */
export const VERIFIED_SLUGS: readonly string[] = [...CONTENT_GROUPS[0].slugs, ...CONTENT_GROUPS[1].slugs];
