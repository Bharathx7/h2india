// The India Hydrogen Tracker's vocabulary (step 4.5): the six sub-views (Projects 738:5437, Manufacturing 738:5994,
// Pilots 738:6499, Stations 739:8, Prices 739:685, State policies 739:1280) plus the map's hubs and valleys (796:7867),
// their statuses in the badge words drawn (A36 adds Cancelled and Completed), and the source tiers from the
// Methodology page (740:469, A35). Safe to import anywhere.

export const TRACKER_VIEWS = [
  { slug: "tracker-projects", view: "Projects", path: "projects" },
  { slug: "tracker-factories", view: "Manufacturing", path: "manufacturing" },
  { slug: "tracker-pilots", view: "Pilots", path: "pilots" },
  { slug: "tracker-stations", view: "Stations", path: "stations" },
  { slug: "tracker-prices", view: "Prices", path: "prices" },
  { slug: "tracker-policies", view: "State policies", path: "state-policies" },
  { slug: "tracker-hubs", view: "Hubs and valleys", path: "hubs" },
] as const;

export type TrackerSlug = (typeof TRACKER_VIEWS)[number]["slug"];
export const TRACKER_SLUGS: TrackerSlug[] = TRACKER_VIEWS.map((v) => v.slug);
export const viewOf = (slug: string) => TRACKER_VIEWS.find((v) => v.slug === slug)?.view ?? slug;

export const STATUSES = {
  "tracker-projects": ["Announced", "Awarded", "Contracted", "Under construction", "Commissioned", "Cancelled"],
  "tracker-factories": ["Announced", "Awarded", "Under construction", "Operating", "Cancelled"],
  "tracker-pilots": ["Planned", "Under construction", "Running", "Completed", "Cancelled"],
  "tracker-stations": ["Planned", "Tender open", "Under construction", "Operating", "Cancelled"],
} as const;

/** Badge tones as drawn on the sub-views and the Methodology table. Cancelled is the Status badge's error tone. */
export const STATUS_TONE: Record<string, "neutral" | "progress" | "success" | "warning" | "error"> = {
  Announced: "neutral",
  Awarded: "progress",
  Contracted: "progress",
  "Under construction": "progress",
  Commissioned: "success",
  Operating: "success",
  Running: "success",
  Completed: "success",
  Planned: "warning",
  "Tender open": "warning",
  Cancelled: "error",
};

/** Methodology 740:469 "Which sources we trust, in order" (A35: the tier is the figure's confidence). */
export const SOURCE_TIERS = [
  { value: "official", label: "Government notice, tender result or official statistic", short: "Official" },
  { value: "filing", label: "Stock exchange or regulatory filing", short: "Filing" },
  { value: "company", label: "Company announcement", short: "Company" },
  { value: "press", label: "Reporting by a named journalist (until confirmed)", short: "Press report" },
] as const;

/** The Methodology page's list as drawn (740:469). */
export const METHODOLOGY_SOURCES = [
  "Government notices, tender results and official statistics",
  "Stock exchange and regulatory filings",
  "Company announcements on their own channels",
  "Reporting by named journalists, until one of the above confirms it",
] as const;

export type SourceTier = (typeof SOURCE_TIERS)[number]["value"];

/** "2028 (company estimate)" on 740:20: an estimated figure says whose estimate it is. */
export function estimateNote(tier: string | null | undefined): string {
  return tier === "company" ? "company estimate" : tier === "official" ? "official estimate" : "estimate";
}

export const TECHNOLOGIES = ["Alkaline", "PEM", "SOEC", "AEM", "PEM fuel cell", "Other"] as const;
export const PROJECT_PRODUCTS = ["Green hydrogen", "Green ammonia", "Green methanol", "Other"] as const;
export const FACTORY_PRODUCTS = ["Electrolyser", "Electrolyser stack", "Fuel cell", "Other"] as const;
export const SIGHT_TRANCHES = ["SIGHT Tranche I", "SIGHT Tranche II", "SIGHT Tranche III", "Not under SIGHT"] as const;
export const PILOT_SECTORS = ["Mobility", "Steel", "Shipping", "Other"] as const;
export const PRICE_PRODUCTS = ["Green H₂", "Green NH₃", "Methanol", "Other"] as const;
export const GST_BASIS = ["Excl. GST", "Incl. GST"] as const;
export const POLICY_TYPES = ["Dedicated", "Provisions"] as const;
export const HUB_KINDS = ["Hub", "Valley"] as const;

/** Methodology 740:469: what each status means and the evidence we need (Projects). */
export const STATUS_MEANINGS = [
  {
    status: "Announced",
    meaning: "A company or agency has said it plans the project.",
    evidence: "A public statement or filing naming the site or size",
  },
  { status: "Awarded", meaning: "It won a tender or incentive.", evidence: "The tender result or award notice" },
  {
    status: "Contracted",
    meaning: "It has signed offtake or supply contracts.",
    evidence: "A filing or both parties' statements",
  },
  {
    status: "Under construction",
    meaning: "Work has started on site.",
    evidence: "Company update, permits or site evidence",
  },
  {
    status: "Commissioned",
    meaning: "It has produced hydrogen to its stated quality.",
    evidence: "A commissioning notice or official figure",
  },
] as const;

export const UNITS_NOTES = [
  "Hydrogen capacity is in tonnes a year (t/yr). Ammonia projects are converted at 0.18 t of hydrogen per t of ammonia.",
  "Electrolyser capacity is nameplate input power in MW. Factory capacity is MW of electrolysers a year (MW/yr).",
  "Prices are as discovered, per kg of product, before GST, unless the row says otherwise.",
] as const;

export const UPDATE_NOTE =
  "Every Monday. Errors we find or are told about are fixed within 1 working day and logged in Recent changes.";
