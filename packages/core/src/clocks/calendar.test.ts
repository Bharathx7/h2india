import { describe, expect, it } from "vitest";
import { istDay, WorkingCalendar } from "./calendar";

// Step 3.8 DONE WHEN: working-day maths skips weekends and listed holidays (M18: Monday to Saturday, minus holidays).
const ist = (s: string) => new Date(`${s}+05:30`);
const cal = new WorkingCalendar(new Set(["2026-11-24", "2026-12-25"]));

describe("working-day calendar", () => {
  it("reads days in IST", () => {
    expect(istDay(new Date("2026-11-12T19:00:00Z"))).toBe("2026-11-13"); // 00:30 IST next day
    expect(istDay(ist("2026-11-12T23:59"))).toBe("2026-11-12");
  });

  it("counts Monday to Saturday, and skips Sundays and holidays", () => {
    expect(cal.isWorkingDay("2026-11-14")).toBe(true); // Saturday
    expect(cal.isWorkingDay("2026-11-15")).toBe(false); // Sunday
    expect(cal.isWorkingDay("2026-11-24")).toBe(false); // Guru Nanak's Birthday
    expect(cal.isWorkingDay("2026-11-23")).toBe(true);
  });

  it("adds working days at the same IST time of day", () => {
    // Thursday 10:00 + 1 → Friday 10:00
    expect(cal.addWorkingDays(ist("2026-11-12T10:00"), 1)).toEqual(ist("2026-11-13T10:00"));
    // Saturday 10:00 + 1 → Monday 10:00 (Sunday skipped)
    expect(cal.addWorkingDays(ist("2026-11-14T10:00"), 1)).toEqual(ist("2026-11-16T10:00"));
    // Monday 23 Nov 16:00 + 1 → Wednesday 25 Nov (Tuesday is a holiday)
    expect(cal.addWorkingDays(ist("2026-11-23T16:00"), 1)).toEqual(ist("2026-11-25T16:00"));
    // Buyer accepts a delivery: 5 working days from Thursday 24 Dec → Thursday 31 Dec (25 Dec and 27 Dec off)
    expect(cal.addWorkingDays(ist("2026-12-24T09:30"), 5)).toEqual(ist("2026-12-31T09:30"));
  });

  it("starts the count at the next working day when it starts on a day off", () => {
    // Sunday 15:00 + 1 working day → end of Monday (Tuesday 00:00)
    expect(cal.addWorkingDays(ist("2026-11-15T15:00"), 1)).toEqual(ist("2026-11-17T00:00"));
    expect(cal.addWorkingDays(ist("2026-11-15T15:00"), 0)).toEqual(ist("2026-11-16T00:00"));
  });

  it("crosses the IST midnight that is still the previous UTC day", () => {
    // 00:30 IST Saturday is Friday 19:00 UTC; + 1 working day → Monday 00:30 IST
    expect(cal.addWorkingDays(ist("2026-11-14T00:30"), 1)).toEqual(ist("2026-11-16T00:30"));
  });

  it("adds hours and calendar days without the calendar", () => {
    expect(cal.add(ist("2026-11-14T10:00"), { hours: 48 })).toEqual(ist("2026-11-16T10:00"));
    expect(cal.add(ist("2026-11-14T10:00"), { days: 15 })).toEqual(ist("2026-11-29T10:00"));
    expect(cal.add(ist("2026-11-14T10:00"), { workingDays: 2 })).toEqual(ist("2026-11-17T10:00"));
  });

  it("counts working days between two times", () => {
    expect(cal.workingDaysBetween(ist("2026-11-20T10:00"), ist("2026-11-25T09:00"))).toBe(3); // Sat, Mon, Wed
  });
});
