import { APPLICATIONS, PRODUCT_CLASSES } from "@h2india/core/catalogue";
import type { PublicCatalogue } from "@h2india/core/catalogue/taxonomy";
import type { FooterColumn, MegaPromo, MegaSection, SiteLinks } from "@h2india/ui";
import { dayMonthYear } from "../news/format";

// Site header, mega menus and footer from Figma (Site header 25:635, Mega menu 369:7387, Footer v2 153:179).
// Labels are the design's. Live parts (category counts, the sponsored supplier, the tracker figure, upcoming
// events, the categories of classes other than Systems) are added from data at request time.

export const SITE_LINKS: SiteLinks = {
  home: "/",
  requestQuote: "/rfq/new",
  signIn: "/sign-in",
  listCompany: "/list-your-company",
  notifications: "/notifications",
  account: "/account",
  signOut: "/sign-out",
  secondary: [
    { label: "For Buyers", href: "/for-buyers" },
    { label: "For Suppliers", href: "/for-suppliers" },
    { label: "Pricing", href: "/pricing" },
    { label: "Advertise", href: "/advertise" },
    { label: "Newsletter", href: "/newsletter" },
  ],
};

export const MEGA_MENUS: MegaSection[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    eyebrow: "Marketplace",
    classes: [
      {
        id: "systems",
        label: "Systems",
        href: "/marketplace/systems",
        categories: [
          { label: "Electrolysers", href: "/marketplace/systems/electrolysers" },
          { label: "Fuel cell systems", href: "/marketplace/systems/fuel-cell-systems" },
          { label: "Compression systems", href: "/marketplace/systems/compression-systems" },
          { label: "Refuelling stations & modules", href: "/marketplace/systems/refuelling-stations" },
          { label: "Dispensers", href: "/marketplace/systems/dispensers" },
          { label: "Storage systems", href: "/marketplace/systems/storage-systems" },
          { label: "Purification & treatment", href: "/marketplace/systems/purification" },
          { label: "Hydrogen generators", href: "/marketplace/systems/hydrogen-generators" },
        ],
      },
      ...PRODUCT_CLASSES.filter((c) => c.id !== "systems").map((c) => ({ ...c, categories: [] })),
    ],
    applications: APPLICATIONS.map(({ label, href }) => ({ label, href })),
    tools: [
      { label: "Brands", href: "/marketplace/brands", icon: "building" },
      { label: "Compare products", href: "/marketplace/compare", icon: "compare" },
      { label: "Request a quote", href: "/rfq/new", icon: "file-text" },
    ],
    sponsor: null,
  },
  {
    id: "directory",
    label: "Directory",
    eyebrow: "Directory",
    primary: [
      {
        label: "Companies",
        description: "Manufacturers, suppliers, EPCs, developers and labs",
        href: "/directory/companies",
      },
      { label: "People & experts", description: "Researchers, engineers and advisors", href: "/directory/people" },
      { label: "Ecosystem map", description: "Who is building what, state by state", href: "/directory/map" },
      { label: "Associations", description: "Industry bodies and alliances", href: "/directory/associations" },
    ],
    linksTitle: "Companies by type",
    links: [
      { label: "Manufacturers", href: "/directory/companies?type=manufacturer" },
      { label: "Suppliers & traders", href: "/directory/companies?type=supplier" },
      { label: "EPC & integrators", href: "/directory/companies?type=epc" },
      { label: "Developers & producers", href: "/directory/companies?type=developer" },
      { label: "Service providers", href: "/directory/companies?type=service" },
      { label: "Testing & certification", href: "/directory/companies?type=testing" },
      { label: "Start-ups", href: "/directory/companies?type=startup" },
      { label: "Research institutes", href: "/directory/companies?type=research" },
    ],
    promo: {
      eyebrow: "For companies",
      title: "Is your company listed?",
      text: "Claim your free profile, add your products and get found by Indian buyers.",
      action: { label: "List your company", href: "/list-your-company", style: "button" },
    },
  },
  {
    id: "news",
    label: "News",
    eyebrow: "News",
    primary: [
      { label: "Latest", description: "Every Indian hydrogen story, newest first", href: "/news" },
      { label: "Policy & regulation", description: "MNRE, SECI and state notifications", href: "/news/policy" },
      { label: "Projects & investment", description: "Plants, hubs, offtake and funding", href: "/news/projects" },
      { label: "Tenders & awards", description: "Bids, results and who won", href: "/news/tenders" },
    ],
    linksTitle: "More topics",
    links: [
      { label: "Technology", href: "/news/technology" },
      { label: "Mobility", href: "/news/mobility" },
      { label: "Markets & prices", href: "/news/markets" },
      { label: "Global to India", href: "/news/global" },
      { label: "Press releases", href: "/news/press-releases" },
      { label: "Newsletter archive", href: "/newsletter/archive" },
    ],
    promo: {
      eyebrow: "Newsletter",
      title: "India H₂ Weekly",
      text: "The week's Indian hydrogen news, tenders and scheme deadlines, every Monday.",
      action: { label: "Subscribe", href: "/newsletter", style: "button" },
    },
  },
  {
    id: "opportunities",
    label: "Opportunities",
    eyebrow: "Opportunities",
    primary: [
      {
        label: "Government schemes",
        description: "Central and state schemes, with deadlines",
        href: "/opportunities/schemes",
      },
      { label: "SIGHT tracker", description: "Tranches, awards and results", href: "/opportunities/sight" },
      { label: "Tenders", description: "Open bids from SECI, PSUs and states", href: "/opportunities/tenders" },
      { label: "Grants & calls", description: "R&D and start-up funding", href: "/opportunities/grants" },
    ],
    linksTitle: "Find your fit",
    links: [
      { label: "Central schemes", href: "/opportunities/schemes?level=central" },
      { label: "State schemes", href: "/opportunities/schemes?level=state" },
      { label: "Closing this week", href: "/opportunities?closing=week" },
      { label: "Tender results & awards", href: "/opportunities/tenders/results" },
      { label: "Jobs & internships", href: "/opportunities/jobs" },
      { label: "Scheme eligibility checker", href: "/opportunities/eligibility" },
    ],
    promo: {
      eyebrow: "Alerts",
      title: "Never miss a deadline",
      text: "Get an email or WhatsApp alert when a tender or scheme that fits you opens.",
      action: { label: "Create an alert", href: "/member/alerts", style: "button" },
    },
  },
  {
    id: "knowledge",
    label: "Knowledge",
    eyebrow: "Knowledge",
    primary: [
      { label: "Insights", description: "Analysis and explainers from the H2 India desk", href: "/knowledge/insights" },
      {
        label: "Hydrogen 101",
        description: "Start here: the basics, chapter by chapter",
        href: "/knowledge/hydrogen-101",
      },
      { label: "Buyer's guides", description: "How to specify and buy, by category", href: "/knowledge/guides" },
      { label: "India Hydrogen Tracker", description: "Projects, awards and capacity, with sources", href: "/tracker" },
    ],
    linksTitle: "Reference",
    links: [
      { label: "Glossary", href: "/knowledge/glossary" },
      { label: "Standards & regulations library", href: "/knowledge/standards" },
      { label: "Reports", href: "/knowledge/reports" },
      { label: "Videos & podcasts", href: "/knowledge/media" },
    ],
    // The card is filled per request by knowledgePromo(): a tracker figure with its source and date, else Hydrogen 101.
    promo: null,
  },
  {
    id: "events",
    label: "Events",
    eyebrow: "Events",
    primary: [
      { label: "Upcoming events", description: "Expos, summits and site visits", href: "/events" },
      { label: "Webinars", description: "Live sessions with replays", href: "/events/webinars" },
      { label: "Training & courses", description: "Skills for engineers and teams", href: "/events/training" },
      { label: "Past event coverage", description: "Talks, photos and takeaways", href: "/events/past" },
    ],
    // "Coming up" lists the next events from the events data.
    linksTitle: "Coming up",
    links: [],
    promo: {
      eyebrow: "Organisers",
      title: "Running a hydrogen event?",
      text: "List it free and reach India's hydrogen community.",
      action: { label: "Submit an event", href: "/events/submit", style: "button" },
    },
  },
];

/**
 * The Marketplace menu from the live catalogue (step 6.2): every class with its category count and its first eight
 * categories, and the visible applications. The site layout calls this on each request, so a category an operator
 * adds or hides in admin Catalogue shows or disappears in the menu at once.
 */
/** One published India Hydrogen Tracker figure (the tracker-overview setting): always with its source and date. */
export interface TrackerFigure {
  value: string;
  label: string;
  source: string;
  asOf: string;
}

/**
 * The card on the right of the Knowledge menu (public QC, 16 Nov 2026: it was empty). The first published tracker
 * figure, with its source and as-of date; until one is published (or for a sample), the Hydrogen 101 starting point.
 */
export function knowledgePromo(figure: TrackerFigure | null): MegaPromo {
  if (figure?.value.trim() && figure.source.trim() && figure.asOf)
    return {
      eyebrow: "India Hydrogen Tracker",
      title: `${figure.value} ${figure.label}`,
      text: `${figure.source} · as of ${dayMonthYear(figure.asOf)}`,
      action: { label: "Open the tracker", href: "/tracker", style: "arrow" },
    };
  return {
    eyebrow: "Start here",
    title: "Hydrogen 101",
    text: "The basics of green hydrogen, chapter by chapter.",
    action: { label: "Start learning", href: "/knowledge/hydrogen-101", style: "button" },
  };
}

export function menusWithCatalogue(cat: PublicCatalogue, trackerFigure: TrackerFigure | null = null): MegaSection[] {
  return MEGA_MENUS.map((m) =>
    m.id === "knowledge"
      ? { ...m, promo: knowledgePromo(trackerFigure) }
      : m.id !== "marketplace"
        ? m
        : {
            ...m,
            classes: cat.classes.map((c) => ({
              id: c.id,
              label: c.label,
              href: `/marketplace/${c.id}`,
              count: c.categories.length,
              categories: c.categories
                .slice(0, 8)
                .map((x) => ({ label: x.label, href: `/marketplace/${c.id}/${x.slug}` })),
            })),
            applications: cat.applications.map((a) => ({
              label: a.shortLabel,
              href: `/marketplace/applications/${a.id}`,
            })),
          },
  );
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Directory", href: "/directory" },
      { label: "Request a quote", href: "/rfq/new" },
      { label: "Compare", href: "/marketplace/compare" },
      { label: "Ecosystem map", href: "/directory/map" },
      { label: "India Hydrogen Tracker", href: "/tracker" },
    ],
  },
  {
    heading: "For business",
    links: [
      { label: "For Buyers", href: "/for-buyers" },
      { label: "For Suppliers", href: "/for-suppliers" },
      { label: "Pricing", href: "/pricing" },
      { label: "Verification criteria", href: "/verification" },
      { label: "Advertise & sponsor", href: "/advertise" },
      { label: "Submit press release", href: "/news/submit" },
      { label: "Submit event", href: "/events/submit" },
      { label: "Post a job", href: "/opportunities/jobs/post" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "News", href: "/news" },
      { label: "Insights", href: "/knowledge/insights" },
      { label: "Hydrogen 101", href: "/knowledge/hydrogen-101" },
      { label: "Glossary", href: "/knowledge/glossary" },
      { label: "Standards library", href: "/knowledge/standards" },
      { label: "Reports", href: "/knowledge/reports" },
      { label: "Videos", href: "/knowledge/media" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Mission", href: "/about/mission" },
      { label: "Team & advisors", href: "/about/team" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Partnership enquiry", href: "/contact/partnerships" },
      { label: "Media kit", href: "/media-kit" },
    ],
  },
  {
    heading: "Trust & legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Editorial policy", href: "/legal/editorial-policy" },
      { label: "Corrections", href: "/legal/corrections" },
      { label: "Sponsored content policy", href: "/legal/sponsored-content" },
      { label: "Grievance officer", href: "/legal/grievance-officer" },
      { label: "Cookie preferences", href: "/legal/cookies#preferences" },
      { label: "Help centre", href: "/help" },
      { label: "Sitemap", href: "/sitemap" },
    ],
  },
];
