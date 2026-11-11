import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("formats in Indian grouping", () => {
    expect(Money.format(4879400_00)).toBe("₹48,79,400");
    expect(Money.format(123456_50n)).toBe("₹1,23,456.50");
    expect(Money.format(999_00)).toBe("₹999");
    expect(Money.format(1000_00)).toBe("₹1,000");
    expect(Money.format(38400000_00n)).toBe("₹3,84,00,000");
    expect(Money.format(0)).toBe("₹0");
    expect(Money.format(-1234_50)).toBe("−₹1,234.50");
    expect(Money.format(1234_00, { paise: "always" })).toBe("₹1,234.00");
    expect(Money.format(4250000_00, { symbol: false })).toBe("42,50,000");
  });

  it("parses rupee text", () => {
    expect(Money.parse("48,79,400")).toBe(4879400_00n);
    expect(Money.parse("₹1,234.5")).toBe(1234_50n);
    expect(() => Money.parse("12.345")).toThrow();
  });

  it("rounds percentages half away from zero to the paisa", () => {
    // 18% GST on ₹38,40,000
    expect(Money.percent(3840000_00, 1800)).toBe(691200_00n);
    // 0.1% TDS on ₹1,005.05 = ₹1.00505 -> ₹1.01
    expect(Money.percent(1005_05, 10)).toBe(1_01n);
    // exactly half a paisa rounds up: 0.5% of ₹1.01 = 0.505 paise... 101 * 50 / 10000 = 0.505 -> 1 paisa
    expect(Money.percent(1_01, 50)).toBe(1n);
    // below half rounds down: 1% of ₹0.49 = 0.49 paise -> 0
    expect(Money.percent(49, 100)).toBe(0n);
    // negative amounts (refunds) mirror positives
    expect(Money.percent(-1005_05, 10)).toBe(-1_01n);
  });

  it("allocates without losing a paisa", () => {
    const parts = Money.allocate(100_00, [1, 1, 1]);
    expect(parts).toEqual([33_34n, 33_33n, 33_33n]);
    expect(Money.add(...parts)).toBe(100_00n);
  });

  it("refuses fractional paise", () => {
    expect(() => Money.format(12.5)).toThrow(RangeError);
  });
});
