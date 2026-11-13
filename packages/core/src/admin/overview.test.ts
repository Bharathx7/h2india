import { describe, expect, it } from "vitest";
import { ageText, slaBadge } from "./overview";

describe("Overview SLA badges (626:8)", () => {
  it("is within the SLA until amber, then amber, then red", () => {
    expect(slaBadge(null, 24, 48)).toEqual({ tone: "success", badge: "Nothing waiting" });
    expect(slaBadge(5, 24, 48)).toEqual({ tone: "success", badge: "Within SLA" });
    expect(slaBadge(30, 24, 48)).toEqual({ tone: "warning", badge: "Over 24 h" });
    expect(slaBadge(48, 24, 48)).toEqual({ tone: "error", badge: "Past SLA" });
  });
  it("writes ages as drawn", () => {
    expect(ageText(0.2)).toBe("12 min");
    expect(ageText(5.4)).toBe("5 h");
    expect(ageText(38)).toBe("1 day 14 h");
    expect(ageText(48)).toBe("2 days");
  });
});
