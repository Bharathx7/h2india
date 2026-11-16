import { describe, expect, it } from "vitest";
import { describeSchedule, quoteFigures, scheduleProblem, upfrontBps } from "./totals";
import {
  acceptable,
  canMoveQuote,
  canMoveRfq,
  needsModeration,
  QUOTE_STATUSES,
  quoteTransitions,
  rfqBadge,
  RFQ_STATUSES,
  rfqTransitions,
  type QuoteMove,
  type RfqMove,
} from "./transitions";

describe("RFQ and quote transitions (step 9.2)", () => {
  it("allows exactly the moves in the tables", () => {
    for (const from of RFQ_STATUSES)
      for (const to of RFQ_STATUSES)
        expect(canMoveRfq(from, to)).toBe((rfqTransitions[from] as readonly string[]).includes(to));
    for (const from of QUOTE_STATUSES)
      for (const to of QUOTE_STATUSES)
        expect(canMoveQuote(from, to)).toBe((quoteTransitions[from] as readonly string[]).includes(to));
    expect(canMoveRfq("Closed", "Sent")).toBe(false);
    expect(canMoveRfq("Draft", "Quotes received")).toBe(false);
    expect(canMoveQuote("Withdrawn", "Sent")).toBe(false);
    expect(canMoveQuote("Accepted", "Not selected")).toBe(false);
  });

  it("makes any other move a type error", () => {
    const ok: RfqMove = { from: "Draft", to: "Sent" };
    // @ts-expect-error Closed has no moves
    const bad: RfqMove = { from: "Closed", to: "Sent" };
    const okQuote: QuoteMove = { from: "Sent", to: "Revised" };
    // @ts-expect-error a withdrawn quote can't be sent again
    const badQuote: QuoteMove = { from: "Withdrawn", to: "Sent" };
    expect([ok, bad, okQuote, badQuote]).toHaveLength(4);
  });

  it("checks with H2 Economy only when more than one supplier is chosen", () => {
    expect(needsModeration(1)).toBe(false);
    expect(needsModeration(2)).toBe(true);
  });

  it("can accept only a sent quote that is still valid", () => {
    const now = new Date("2026-11-10T06:00:00Z");
    expect(acceptable("Sent", new Date("2026-11-30T18:29:00Z"), now)).toBe(true);
    expect(acceptable("Revised", null, now)).toBe(true);
    expect(acceptable("Sent", new Date("2026-11-09T18:29:00Z"), now)).toBe(false);
    expect(acceptable("Withdrawn", null, now)).toBe(false);
    expect(acceptable("Expired", null, now)).toBe(false);
  });

  it("shows the designed badges (557:8)", () => {
    const now = new Date("2026-11-10T06:00:00Z");
    const day = 86_400_000;
    const h48 = 2 * day;
    const base = { offerDeadline: new Date(now.getTime() + 4 * day), suppliers: 5, quoted: 3 };
    expect(rfqBadge({ ...base, status: "Quotes received" }, h48, now).label).toBe("Quotes received 3/5");
    expect(rfqBadge({ ...base, status: "Sent", quoted: 0, suppliers: 4 }, h48, now).label).toBe("Sent (4)");
    expect(
      rfqBadge({ ...base, status: "Quotes received", offerDeadline: new Date(now.getTime() + day) }, h48, now).label,
    ).toBe("Expiring");
    expect(rfqBadge({ ...base, status: "Returned" }, h48, now).label).toBe("Returned by moderation");
    expect(rfqBadge({ ...base, status: "Closed", offerDeadline: new Date(now.getTime() + day) }, h48, now).label).toBe(
      "Closed",
    );
  });
});

describe("quote figures (560:8, 619:8)", () => {
  it("matches the comparison to the rupee", () => {
    // Pranava H2: ₹79,60,000 for 2 units at 18% → ₹93,92,800.
    const f = quoteFigures([{ quantity: 2, unitPricePaise: 398_000_000n, gstRateBps: 1800 }], {
      paise: 0n,
      gstRateBps: 0,
    });
    expect(f.subtotalPaise).toBe(796_000_000n);
    expect(f.gstPaise).toBe(143_280_000n);
    expect(f.totalPaise).toBe(939_280_000n);
    expect(f.gstRateBps).toBe(1800);
  });

  it("adds freight with its GST (₹40,20,000 × 2 plus ₹60,000 freight → ₹95,58,000)", () => {
    const f = quoteFigures([{ quantity: 2, unitPricePaise: 402_000_000n, gstRateBps: 1800 }], {
      paise: 6_000_000n,
      gstRateBps: 1800,
    });
    expect(f.totalPaise).toBe(955_800_000n);
  });

  it("reports a mixed GST rate as null", () => {
    const f = quoteFigures(
      [
        { quantity: 1, unitPricePaise: 100n, gstRateBps: 1800 },
        { quantity: 1, unitPricePaise: 100n, gstRateBps: 1200 },
      ],
      { paise: 0n, gstRateBps: 0 },
    );
    expect(f.gstRateBps).toBeNull();
  });

  it("checks and describes payment schedules", () => {
    const s = [
      { percentBps: 3000, trigger: "On confirmation" },
      { percentBps: 7000, trigger: "Before dispatch" },
    ];
    expect(scheduleProblem(s)).toBeNull();
    expect(describeSchedule(s)).toBe("30% on confirmation, 70% before dispatch");
    expect(scheduleProblem([{ percentBps: 5000, trigger: "Advance" }])).toMatch("adds up to 50%");
    expect(scheduleProblem([])).toBe("Add a payment schedule");
    expect(
      upfrontBps([
        { percentBps: 1000, trigger: "Advance" },
        { percentBps: 8000, trigger: "On receipt" },
        { percentBps: 1000, trigger: "Retention" },
      ]),
    ).toBe(1000);
  });
});
