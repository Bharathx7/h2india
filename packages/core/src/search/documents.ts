import { PRICE_FIELD } from "./indexes";

// What a search document looks like. Every document carries what a result row shows (title, meta line, link) and the
// fields its index searches. Builders here are the only way a document is made, so the no-price rule has one home.

export interface SearchDocument {
  /** Unique in its index: the record's id. */
  id: string;
  title: string;
  /** The grey line under the title in the overlay, for example "Analysis · 6 Nov 2026". */
  meta: string;
  href: string;
  [field: string]: unknown;
}

/** The fields a product document may have (step 6 fills them). Anything else, a price above all, is dropped. */
export const PRODUCT_FIELDS = [
  "id",
  "title",
  "meta",
  "href",
  "name",
  "brand",
  "model",
  "class",
  "category",
  "categoryPath",
  "applications",
  "attributes",
  "badges",
  "state",
  "madeInIndia",
  "supplierName",
  "summary",
  "publishedAt",
] as const;

/** A rupee amount written into text, for example "₹48,000" or "Rs. 5 lakh". */
const RUPEE_TEXT = /₹|\bRs\.?\s?\d|\bINR\s?\d/i;

/** Finds a price anywhere in a document (a price-like field name, or a rupee amount in text). Returns the path or null. */
export function findPriceField(value: unknown, path = ""): string | null {
  if (typeof value === "string") return RUPEE_TEXT.test(value) ? path || "(text)" : null;
  if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) {
      const found = findPriceField(v, `${path}[${String(i)}]`);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      const here = path ? `${path}.${key}` : key;
      if (PRICE_FIELD.test(key)) return here;
      const found = findPriceField(v, here);
      if (found) return found;
    }
  }
  return null;
}

/** A product document with only the allowed fields. Throws if a price still hides inside one (attributes, say). */
export function productDocument(input: Record<string, unknown>): SearchDocument {
  const doc: Record<string, unknown> = {};
  for (const key of PRODUCT_FIELDS) if (input[key] !== undefined) doc[key] = input[key];
  const price = findPriceField(doc);
  if (price) throw new Error(`A product search document can't hold a price (${price}).`);
  return doc as SearchDocument;
}
