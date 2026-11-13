import type { FieldSpec } from "./fields";

// How a record editor groups its fields into cards (640:8 Scheme, 640:773 Tender, 643:8 Grant, 643:778 Event,
// 643:1330 Tracker record, 645:8 Job, 645:773 Glossary term, 645:1249 Standard). The first card holds the record
// itself; the official page and documents get their own card; every other list or group gets a card of its own.
// Pure: unit-tested.

const SOURCE_FIELDS = new Set(["sourceUrl", "documents"]);

/** The first card's title where the frame names it; otherwise "About the <record>". */
const MAIN_TITLE: Record<string, string> = {
  "tracker-projects": "Project",
  "tracker-factories": "Factory",
  "tracker-pilots": "Pilot",
  "tracker-stations": "Station",
  "tracker-prices": "Price",
  "tracker-policies": "State policy",
  "tracker-hubs": "Hub",
  glossary: "Term",
};
const SOURCES_TITLE: Record<string, string> = { tenders: "Official documents" };

export interface Card {
  title: string;
  fields: FieldSpec[];
}

/**
 * Cards drawn on the frames for some records, in their order (643:8 Grant, 643:778 Event, 645:8 Job, 645:1249
 * Standard). Fields a frame doesn't show still get the generic cards after these, so nothing becomes uneditable.
 */
const CARDS: Record<string, { title: string; names: string[] }[]> = {
  grants: [
    {
      title: "At a glance",
      names: [
        "title",
        "funder",
        "funderName",
        "amountPerProject",
        "summary",
        "themes",
        "whoCanApply",
        "whoText",
        "deadline",
        "statusOverride",
        "focusAreas",
        "focusNote",
        "states",
        "topics",
      ],
    },
    {
      title: "How to apply and documents",
      names: [
        "steps",
        "howToApply",
        "sourceUrl",
        "documents",
        "pastCallLabel",
        "pastCallUrl",
        "pastAwardees",
        "nextCallExpected",
      ],
    },
  ],
  events: [
    {
      title: "Event details",
      names: [
        "name",
        "organiser",
        "eventType",
        "attendance",
        "startsAt",
        "endsAt",
        "venue",
        "city",
        "states",
        "summaryLine",
        "tickets",
        "priceText",
        "registrationUrl",
        "description",
        "listedBy",
        "topics",
      ],
    },
    { title: "Placement", names: ["sponsoredPlacement", "inNewsletter"] },
  ],
  jobs: [
    {
      title: "Role",
      names: [
        "role",
        "company",
        "companySlug",
        "companyLine",
        "function",
        "jobType",
        "location",
        "workMode",
        "locationNote",
        "states",
        "experience",
        "salaryBand",
        "description",
        "skills",
        "topics",
      ],
    },
    { title: "Apply and dates", names: ["howToApply", "applyEmail", "sourceUrl", "postedAt", "closesAt", "featured"] },
  ],
  standards: [
    {
      title: "Record",
      names: [
        "issuer",
        "code",
        "kind",
        "inForce",
        "dated",
        "title",
        "documentType",
        "checkedAt",
        "summary",
        "scope",
        "appliesTo",
        "related",
        "sourceUrl",
      ],
    },
  ],
};

export function recordCards(slug: string, singular: string, fields: FieldSpec[]): Card[] {
  const drawn = CARDS[slug];
  if (drawn) {
    const byName = new Map(fields.filter((f) => !f.sidebar).map((f) => [f.name, f]));
    const cards: Card[] = [];
    for (const c of drawn) {
      const list = c.names.flatMap((n) => {
        const f = byName.get(n);
        if (!f) return [];
        byName.delete(n);
        return [f];
      });
      if (list.length) cards.push({ title: c.title, fields: list });
    }
    const rest = genericCards(slug, singular, [...byName.values()], "More details");
    return [...cards, ...rest];
  }
  return genericCards(slug, singular, fields);
}

function genericCards(slug: string, singular: string, fields: FieldSpec[], firstTitle?: string): Card[] {
  const main = fields.filter((f) => !f.sidebar);
  const own = (f: FieldSpec) => !SOURCE_FIELDS.has(f.name) && (f.kind === "array" || f.kind === "group");
  const first = main.filter((f) => !SOURCE_FIELDS.has(f.name) && !own(f));
  const sources = main.filter((f) => SOURCE_FIELDS.has(f.name));
  const cards: Card[] = [];
  if (first.length)
    cards.push({ title: firstTitle ?? MAIN_TITLE[slug] ?? `About the ${singular.toLowerCase()}`, fields: first });
  for (const f of main.filter(own)) cards.push({ title: f.label, fields: [{ ...f, bare: true }] });
  if (sources.length) cards.push({ title: SOURCES_TITLE[slug] ?? "Sources and documents", fields: sources });
  return cards;
}
