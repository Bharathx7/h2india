import { describe, expect, it } from "vitest";
import { diffRecord, formatValue, indianNumber, monthYear, rupeesFromPaise, type TrackedField } from "./format";

const tracked: TrackedField[] = [
  { name: "status", label: "Status" },
  { name: "capacityTpa", label: "Capacity (t/yr)", kind: "number" },
  { name: "closingDate", label: "Closing date", kind: "day" },
  { name: "pressures", label: "Pressure (bar)", kind: "list" },
  { name: "source.name", label: "Source" },
];

describe("tracker formatting", () => {
  it("writes numbers, prices and months the Indian way", () => {
    expect(indianNumber(140000)).toBe("1,40,000");
    expect(indianNumber(1260000)).toBe("12,60,000");
    expect(rupeesFromPaise(39700)).toBe("397.00");
    expect(rupeesFromPaise(5240)).toBe("52.40");
    expect(monthYear("2026-05-01T00:00:00.000Z")).toBe("May 2026");
    expect(formatValue([350, 700], "list")).toBe("350 / 700");
    expect(formatValue(null)).toBe("—");
  });

  it("lists each changed field with before and after, as on Recent changes (740:841)", () => {
    const before = { status: "Contracted", capacityTpa: 40000, pressures: [350], source: { name: "Port notice" } };
    const after = {
      status: "Under construction",
      capacityTpa: 50000,
      closingDate: "2026-12-04T09:30:00.000Z",
      pressures: [350, 700],
      source: { name: "Port notice" },
    };
    expect(diffRecord(before, after, tracked)).toEqual([
      { field: "Status", before: "Contracted", after: "Under construction" },
      { field: "Capacity (t/yr)", before: "40,000", after: "50,000" },
      { field: "Closing date", before: "—", after: "4 Dec 2026" },
      { field: "Pressure (bar)", before: "350", after: "350 / 700" },
    ]);
  });

  it("logs a first publish as the record being added, and nothing when nothing tracked changed", () => {
    expect(diffRecord(null, { status: "Announced" }, tracked)).toEqual([
      { field: "Record", before: "—", after: "Added" },
    ]);
    expect(diffRecord({ status: "Announced", note: "a" }, { status: "Announced", note: "b" }, tracked)).toEqual([]);
  });
});
