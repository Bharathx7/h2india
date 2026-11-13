import { describe, expect, it } from "vitest";
import { categoryMeta, historyLine } from "./format";

describe("catalogue screen words", () => {
  it("writes history lines as drawn on 636:596", () => {
    expect(
      historyLine({
        at: new Date("2026-11-11T03:35:00Z"),
        who: "Rohit Menon",
        summary: "added Noise level (dB(A), test condition: at 1 m, optional)",
      }),
    ).toEqual({
      when: "11 Nov, 9:05 AM IST",
      text: "Rohit Menon added Noise level (dB(A), test condition: at 1 m, optional)",
    });
  });

  it("writes the category line", () => {
    expect(
      categoryMeta({
        liveProducts: 41,
        attributes: 10,
        lastChange: { at: new Date("2026-11-11T03:35:00Z"), who: "Rohit Menon" },
      }),
    ).toBe("41 live products · 10 attributes · last changed 11 Nov by Rohit Menon");
    expect(categoryMeta({ liveProducts: 0, attributes: 1, lastChange: null })).toBe("0 live products · 1 attribute");
  });
});
