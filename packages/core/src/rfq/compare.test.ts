import { describe, expect, it } from "vitest";
import { compareQuotes, type ComparedQuote } from "./compare";

// The three quotes on 560:8.
const q = (id: string, o: Partial<ComparedQuote>): ComparedQuote => ({
  quoteId: id,
  subtotalPaise: 0n,
  gstRateBps: 1800,
  totalPaise: 0n,
  deliveryTerms: null,
  freightIncluded: false,
  leadTimeWeeks: null,
  validUntil: null,
  warrantyMonths: null,
  schedule: [],
  ...o,
});
const hydrotek = q("hydrotek", {
  subtotalPaise: 860_000_000n,
  totalPaise: 1_014_800_000n,
  freightIncluded: true,
  leadTimeWeeks: 14,
  validUntil: new Date("2026-11-30T12:30:00Z"),
  warrantyMonths: 24,
  schedule: [
    { percentBps: 3000, trigger: "On confirmation" },
    { percentBps: 7000, trigger: "Before dispatch" },
  ],
});
const pranava = q("pranava", {
  subtotalPaise: 796_000_000n,
  totalPaise: 939_280_000n,
  freightIncluded: true,
  leadTimeWeeks: 18,
  validUntil: new Date("2026-11-14T12:30:00Z"),
  warrantyMonths: 18,
  schedule: [
    { percentBps: 1000, trigger: "Advance" },
    { percentBps: 8000, trigger: "On receipt" },
    { percentBps: 1000, trigger: "Retention" },
  ],
});
const sahyadri = q("sahyadri", {
  subtotalPaise: 824_000_000n,
  totalPaise: 972_320_000n,
  freightIncluded: false,
  leadTimeWeeks: 12,
  validUntil: new Date("2026-12-05T12:30:00Z"),
  warrantyMonths: 24,
  schedule: [
    { percentBps: 5000, trigger: "On confirmation" },
    { percentBps: 5000, trigger: "Before dispatch" },
  ],
});

describe("quote comparison highlights (560:8)", () => {
  it("highlights the right cell in every row", () => {
    const c = compareQuotes([hydrotek, pranava, sahyadri]).best;
    expect(c.price.ids).toEqual(["pranava"]);
    expect(c.total.ids).toEqual(["pranava"]);
    expect(c.delivery.ids).toEqual(["hydrotek", "pranava"]);
    expect(c.lead.ids).toEqual(["sahyadri"]);
    expect(c.validity.ids).toEqual(["sahyadri"]);
    expect(c.warranty.ids).toEqual(["hydrotek", "sahyadri"]);
    expect(c.schedule.ids).toEqual(["pranava"]);
  });

  it("highlights nothing with one quote, or when all are equal", () => {
    expect(compareQuotes([pranava]).best.total.ids).toEqual([]);
    expect(compareQuotes([hydrotek, { ...sahyadri, quoteId: "x" }]).best.warranty.ids).toEqual([]);
  });
});
