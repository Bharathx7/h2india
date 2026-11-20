import type { IconName } from "@h2india/ui";
import { CONTENT_SLUGS } from "./registry";

// The content sections in plain words (founder, 20 Nov 2026: "the CMS is too confusing"). One list drives the content
// side menu, the content home, the section pages and, later, the sections an editor may be limited to. Every
// collection the native screens edit belongs to exactly one section (sections.test.ts).

export interface SectionType {
  slug: string;
  /** What it is, in one line, for someone who has never opened the CMS. */
  description: string;
  /** Hidden behind "History" (written by the system, read-only or nearly). */
  history?: boolean;
}

export interface ContentSection {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  /** Where the side menu goes; most sections open their own page (?section=). */
  href: string;
  types: SectionType[];
}

export const CONTENT_SECTIONS: ContentSection[] = [
  {
    id: "articles",
    label: "Articles",
    description: "News stories, insights, press releases and sponsored posts.",
    icon: "newspaper",
    href: "/admin/content?tab=articles",
    types: [],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    description: "Schemes, tenders, grants and jobs readers can apply for.",
    icon: "clipboard-check",
    href: "/admin/content?section=opportunities",
    types: [
      { slug: "schemes", description: "Government schemes and incentives, with their rules and deadlines." },
      { slug: "tenders", description: "Open bids from SECI, PSUs and states, and their results." },
      { slug: "grants", description: "R&D and start-up funding calls." },
      { slug: "jobs", description: "Jobs and internships, including ones companies send for review." },
    ],
  },
  {
    id: "events",
    label: "Events",
    description: "Expos, summits, webinars and training.",
    icon: "calendar",
    href: "/admin/content?section=events",
    types: [{ slug: "events", description: "Every event and webinar shown on the Events pages." }],
  },
  {
    id: "tracker",
    label: "Tracker",
    description: "The India Hydrogen Tracker: every value with its source and date.",
    icon: "bar-chart",
    href: "/admin/content?section=tracker",
    types: [
      { slug: "tracker-projects", description: "Production projects: capacity, stage and developer." },
      { slug: "tracker-factories", description: "Electrolyser and equipment factories." },
      { slug: "tracker-pilots", description: "Pilot and demonstration projects." },
      { slug: "tracker-stations", description: "Hydrogen refuelling stations." },
      { slug: "tracker-prices", description: "Price points and auction results." },
      { slug: "tracker-policies", description: "Central and state policies." },
      { slug: "tracker-hubs", description: "Hydrogen hubs and valleys." },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    description: "Hydrogen 101, guides, glossary, standards, reports, videos and podcasts.",
    icon: "file-text",
    href: "/admin/content?section=knowledge",
    types: [
      { slug: "chapters", description: "Hydrogen 101 chapters and their quizzes." },
      { slug: "guides", description: "Buyer's guides and how-to guides." },
      { slug: "glossary", description: "Terms explained; they show as hover cards in articles." },
      { slug: "standards", description: "The standards and regulations library." },
      { slug: "reports", description: "Reports readers can download after leaving their details." },
      { slug: "videos", description: "Videos on the Knowledge pages." },
      { slug: "podcasts", description: "Podcast episodes." },
    ],
  },
  {
    id: "newsletter",
    label: "Newsletter",
    description: "H2 Economy Weekly issues: write, schedule and see how they did.",
    icon: "mail",
    href: "/admin/content?tab=newsletter",
    types: [{ slug: "newsletter-issues", description: "Each issue of the newsletter." }],
  },
  {
    id: "newsroom",
    label: "Authors and topics",
    description: "Who writes, and the topics and tags that sort articles.",
    icon: "users",
    href: "/admin/content?section=newsroom",
    types: [
      { slug: "authors", description: "Everyone who writes for H2 Economy." },
      { slug: "topics", description: "Topics; a topic with an order is a news section." },
      { slug: "tags", description: "Tags that link related articles." },
    ],
  },
  {
    id: "directory",
    label: "People and associations",
    description: "People and associations shown in the member Directory.",
    icon: "building",
    href: "/admin/content?section=directory",
    types: [
      { slug: "people", description: "People in the Directory; only those who agreed to be shown." },
      { slug: "associations", description: "Industry associations and their members." },
    ],
  },
  {
    id: "site",
    label: "Site pages and settings",
    description: "Legal pages, help centre, team, marketplace pages and site-wide settings.",
    icon: "layout-template",
    href: "/admin/content?section=site",
    types: [
      { slug: "legal-pages", description: "Terms, privacy and other legal pages, with their versions." },
      { slug: "help-articles", description: "Help centre articles." },
      { slug: "team-members", description: "Management team and advisors on the About pages." },
      { slug: "application-pages", description: "The marketplace's browse-by-application pages." },
      { slug: "early-listings", description: "Suppliers who asked to be listed before launch." },
    ],
  },
  {
    id: "media",
    label: "Media library",
    description: "Images, video and audio files, and report PDFs.",
    icon: "image",
    href: "/admin/content?section=media",
    types: [
      { slug: "media", description: "Images used across the site. Every image needs alt text." },
      { slug: "media-files", description: "Video and audio files for videos and podcasts." },
      { slug: "report-files", description: "Report PDFs. Kept private; readers get them after the form." },
    ],
  },
  {
    id: "inbox",
    label: "Inbox",
    description: "What readers sent in, and the history the system keeps.",
    icon: "inbox",
    href: "/admin/content?section=inbox",
    types: [
      { slug: "corrections", description: "Corrections readers reported on articles." },
      { slug: "submissions", description: "Events, press releases and messages sent through the site." },
      { slug: "source-changes", description: "Official sources that changed: a record may need updating." },
      {
        slug: "report-leads",
        description: "People who downloaded a report, with their consent. Personal data.",
        history: true,
      },
      {
        slug: "tracker-changes",
        description: "Written when a tracker record is published; feeds Recent changes.",
        history: true,
      },
    ],
  },
];

export function sectionOf(slug: string): ContentSection | undefined {
  return CONTENT_SECTIONS.find((s) => s.types.some((t) => t.slug === slug));
}

export function sectionById(id: string | undefined): ContentSection | undefined {
  return CONTENT_SECTIONS.find((s) => s.id === id);
}

export function describeType(slug: string): string | undefined {
  return sectionOf(slug)?.types.find((t) => t.slug === slug)?.description;
}

/** Every collection the native screens edit, in section order (for checks). */
export const SECTION_SLUGS: readonly string[] = CONTENT_SECTIONS.flatMap((s) => s.types.map((t) => t.slug));

/** Collections in CONTENT_SLUGS that no section lists (the test keeps this empty). */
export function unsectioned(): string[] {
  return CONTENT_SLUGS.filter((s) => !SECTION_SLUGS.includes(s));
}
