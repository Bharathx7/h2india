import { describe, expect, it } from "vitest";
import { clockBadge, dueBadge, durationWords } from "./views";

const now = new Date("2026-11-10T10:00:00Z"); // 3:30 PM IST

describe("compliance clocks (660:281)", () => {
  it("says how long is left, as drawn", () => {
    expect(clockBadge(new Date(now.getTime() + 11 * 3_600_000 + 55 * 60_000), null, now)).toEqual({
      text: "Due in 11 h 55 m",
      tone: "warning",
    });
    expect(clockBadge(new Date("2026-11-24T18:00:00Z"), null, now).text).toBe("14 days left");
    expect(clockBadge(null, new Date("2026-11-04T05:00:00Z"), now)).toEqual({ text: "Done 4 Nov", tone: "success" });
    expect(clockBadge(new Date(now.getTime() - 26 * 3_600_000), null, now)).toEqual({
      text: "Overdue by 1 day",
      tone: "error",
    });
  });
  it("shows data-rights due dates and clock lengths in words", () => {
    expect(dueBadge(new Date("2026-12-09T06:00:00Z"), false, now).text).toBe("Due 9 Dec");
    expect(durationWords({ hours: 24 })).toBe("24 hours");
    expect(durationWords({ days: 15 })).toBe("15 days");
  });
});
