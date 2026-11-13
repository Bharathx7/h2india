import { upfrontBps, type PaymentLine } from "./totals";

// Quote comparison (560:8), step 9.6: one column per supplier's latest sent quote, rows as drawn, and the best value in
// each row highlighted: lowest price and total, freight included, shortest lead time, longest validity and warranty,
// least paid upfront. A tie highlights every quote that shares the best value; a row where all are equal highlights
// none. Pure: unit-tested with the frame's figures.

export interface ComparedQuote {
  quoteId: string;
  subtotalPaise: bigint;
  gstRateBps: number | null;
  totalPaise: bigint;
  deliveryTerms: string | null;
  freightIncluded: boolean;
  leadTimeWeeks: number | null;
  validUntil: Date | null;
  warrantyMonths: number | null;
  schedule: PaymentLine[];
}

export type Highlight = "Lowest" | "Freight included" | "Shortest" | "Longest" | "Least paid upfront";

export interface Comparison {
  /** Row key → quote ids highlighted in that row, with the badge word. */
  best: Record<
    "price" | "total" | "delivery" | "lead" | "validity" | "warranty" | "schedule",
    { ids: string[]; label: Highlight }
  >;
}

function pick<T>(
  quotes: ComparedQuote[],
  value: (q: ComparedQuote) => T | null,
  better: (a: T, b: T) => number,
): string[] {
  const known = quotes.filter((q) => value(q) !== null);
  if (known.length < 2) return [];
  const sorted = [...known].sort((a, b) => better(value(a) as T, value(b) as T));
  const top = value(sorted[0] as ComparedQuote) as T;
  const ids = known.filter((q) => better(value(q) as T, top) === 0).map((q) => q.quoteId);
  return ids.length === known.length ? [] : ids;
}

const big = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);

export function compareQuotes(quotes: ComparedQuote[]): Comparison {
  const freight = quotes.filter((q) => q.freightIncluded).map((q) => q.quoteId);
  return {
    best: {
      price: { ids: pick(quotes, (q) => q.subtotalPaise, big), label: "Lowest" },
      total: { ids: pick(quotes, (q) => q.totalPaise, big), label: "Lowest" },
      delivery: { ids: freight.length && freight.length < quotes.length ? freight : [], label: "Freight included" },
      lead: {
        ids: pick(
          quotes,
          (q) => q.leadTimeWeeks,
          (a, b) => a - b,
        ),
        label: "Shortest",
      },
      validity: {
        ids: pick(
          quotes,
          (q) => q.validUntil?.getTime() ?? null,
          (a, b) => b - a,
        ),
        label: "Longest",
      },
      warranty: {
        ids: pick(
          quotes,
          (q) => q.warrantyMonths,
          (a, b) => b - a,
        ),
        label: "Longest",
      },
      schedule: {
        ids: pick(
          quotes,
          (q) => (q.schedule.length ? upfrontBps(q.schedule) : null),
          (a, b) => a - b,
        ),
        label: "Least paid upfront",
      },
    },
  };
}
