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
] as const;

export const CONTENT_SLUGS: readonly string[] = CONTENT_GROUPS.flatMap((g) => g.slugs);

/** Site-wide settings kept as single documents (Payload globals). The Pre-launch allow-list stays in the CMS. */
export const SETTING_SLUGS: readonly string[] = [
  "home-figures",
  "trust-settings",
  "pricing",
  "audience-faqs",
  "maintenance",
  "tracker-overview",
  "tracker-methodology",
  "sight-tracker",
];

/** Records that carry "Last verified" (A30). */
export const VERIFIED_SLUGS: readonly string[] = [...CONTENT_GROUPS[0].slugs, ...CONTENT_GROUPS[1].slugs];
