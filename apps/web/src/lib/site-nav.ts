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
  // Public QC 2 (16 Nov 2026): the header's Sign in is Buyer sign in (it links to Supplier and Member sign in);
  // List your company is Create a supplier account.
  signIn: "/buyer/sign-in",
  listCompany: "/join/supplier",
  notifications: "/notifications",
  account: "/account",
  signOut: "/sign-out",
  secondary: [
    // Public QC, 16 Nov 2026: For Members sits between For Buyers and For Suppliers.
    { label: "For Buyers", href: "/for-buyers" },
    { label: "For Members", href: "/for-members" },
    { label: "For Suppliers", href: "/for-suppliers" },
    { label: "Pricing", href: "/pricing" },
  ],
  // Public QC 5 (20 Nov 2026): the strip keeps only the four above. Advertise and Newsletter moved into the News menu
  // and List your company into the Marketplace menu's tools; the phone menu lists these two under the strip links.
  more: [
    { label: "Advertise", href: "/advertise" },
    { label: "Newsletter", href: "/newsletter" },
  ],
};

/**
 * Request a quote is for buyers (public QC 4, 16 Nov 2026): only a buyer company can send a quote request. Signed-out
 * visitors still see it (sign-in or sign-up comes first); signed-in suppliers, members and staff don't.
 */
export function canRequestQuote(user: { workspaceHref: string } | null): boolean {
  return user === null || user.workspaceHref === "/buyer";
}

/** The mega menus without List your company, for signed-in people (it creates a supplier account; public QC 5). */
export function menusWithoutListCompany(menus: MegaSection[]): MegaSection[] {
  return menus.map((m) => (m.tools ? { ...m, tools: m.tools.filter((t) => t.href !== SITE_LINKS.listCompany) } : m));
}

const isQuoteLink = (href: string) =>
  href === SITE_LINKS.requestQuote || href.startsWith(`${SITE_LINKS.requestQuote}?`);

/** The mega menus without Request a quote, for signed-in people who aren't buyers. */
export function menusWithoutQuote(menus: MegaSection[]): MegaSection[] {
  return menus.map((m) => (m.tools ? { ...m, tools: m.tools.filter((t) => !isQuoteLink(t.href)) } : m));
}

/** The footer without Request a quote, for signed-in people who aren't buyers. */
export function footerWithoutQuote(columns: FooterColumn[]): FooterColumn[] {
  return columns.map((c) => ({ ...c, links: c.links.filter((l) => !isQuoteLink(l.href)) }));
}

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
      { label: "List your company", href: "/join/supplier", icon: "plus" },
    ],
    sponsor: null,
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
    linksTitle: "More",
    links: [
      { label: "Technology", href: "/news/technology" },
      { label: "Mobility", href: "/news/mobility" },
      { label: "Markets & prices", href: "/news/markets" },
      { label: "Global to India", href: "/news/global" },
      { label: "Press releases", href: "/news/press-releases" },
      { label: "Newsletter", href: "/newsletter" },
      { label: "Newsletter archive", href: "/newsletter/archive" },
      { label: "Advertise", href: "/advertise" },
    ],
    promo: {
      eyebrow: "Newsletter",
      title: "H2 Economy Weekly",
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
      {
        label: "Insights",
        description: "Analysis and explainers from the H2 Economy desk",
        href: "/knowledge/insights",
      },
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

// Founder (20 Nov 2026): a short footer. Grievance officer and Cookie preferences stay: the law expects them to be easy
// to reach (IT Rules 2021, DPDP consent withdrawal).
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "India Hydrogen Tracker", href: "/tracker" },
    ],
  },
  {
    heading: "For business",
    links: [
      { label: "For Buyers", href: "/for-buyers" },
      { label: "For Members", href: "/for-members" },
      { label: "For Suppliers", href: "/for-suppliers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "News", href: "/news" },
      { label: "Hydrogen 101", href: "/knowledge/hydrogen-101" },
      { label: "Reports", href: "/knowledge/reports" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Trust & legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Cookie preferences", href: "/legal/cookies#preferences" },
      { label: "Grievance officer", href: "/legal/grievance-officer" },
      { label: "Help centre", href: "/help" },
    ],
  },
];
