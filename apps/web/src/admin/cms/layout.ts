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

export function recordCards(slug: string, singular: string, fields: FieldSpec[]): Card[] {
  const main = fields.filter((f) => !f.sidebar);
  const own = (f: FieldSpec) => !SOURCE_FIELDS.has(f.name) && (f.kind === "array" || f.kind === "group");
  const first = main.filter((f) => !SOURCE_FIELDS.has(f.name) && !own(f));
  const sources = main.filter((f) => SOURCE_FIELDS.has(f.name));
  const cards: Card[] = [];
  if (first.length) cards.push({ title: MAIN_TITLE[slug] ?? `About the ${singular.toLowerCase()}`, fields: first });
  for (const f of main.filter(own)) cards.push({ title: f.label, fields: [{ ...f, bare: true }] });
  if (sources.length) cards.push({ title: SOURCES_TITLE[slug] ?? "Sources and documents", fields: sources });
  return cards;
}
