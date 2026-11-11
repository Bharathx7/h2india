import { describe, expect, it } from "vitest";
import { formatDate, parseDate } from "./DatePicker";

describe("date picker text", () => {
  it("formats as the design does", () => {
    expect(formatDate(new Date(2026, 10, 12))).toBe("12 Nov 2026");
  });
  it("reads the formats people type", () => {
    for (const t of ["12 Nov 2026", "12 November 2026", "12/11/2026", "12-11-2026", "2026-11-12"]) {
      expect(parseDate(t)?.toDateString()).toBe(new Date(2026, 10, 12).toDateString());
    }
  });
  it("rejects impossible dates", () => {
    expect(parseDate("31/02/2026")).toBeUndefined();
    expect(parseDate("tomorrow")).toBeUndefined();
  });
});
