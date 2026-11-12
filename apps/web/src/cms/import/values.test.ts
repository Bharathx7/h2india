import { describe, expect, it } from "vitest";
import { convertCell, parseDate, sameValue } from "./values";

describe("import cells", () => {
  it("reads dates as India time", () => {
    expect(parseDate("2026-11-04")).toBe("2026-11-03T18:30:00.000Z");
    expect(parseDate("2026-12-02 15:00")).toBe("2026-12-02T09:30:00.000Z");
    expect(parseDate("2026-05")).toBe("2026-04-30T18:30:00.000Z");
    expect(parseDate("4 Nov 2026")).toBeNull();
  });

  it("converts by field type and names what's wrong", () => {
    expect(convertCell("number", false, "1,40,000")).toEqual({ value: 140000 });
    expect(convertCell("number", true, "350; 700")).toEqual({ value: [350, 700] });
    expect(convertCell("number", false, "lots")).toEqual({ error: "a number" });
    expect(convertCell("select", true, "PEM; Alkaline")).toEqual({ value: ["PEM", "Alkaline"] });
    expect(convertCell("checkbox", false, "Yes")).toEqual({ value: true });
    expect(convertCell("checkbox", false, "perhaps")).toEqual({ error: "yes or no" });
    expect(convertCell("array", false, '[{"name":"Kutch Ammonia Works"}]')).toEqual({
      value: [{ name: "Kutch Ammonia Works" }],
    });
    expect(convertCell("upload", false, "x.png")).toHaveProperty("error");
    expect(convertCell("text", false, "  ")).toEqual({ value: null });
  });

  it("sees stored values as the same despite ids and representation", () => {
    expect(sameValue([{ name: "A" }], [{ id: "x1", name: "A" }])).toBe(true);
    expect(sameValue("2026-11-03T18:30:00.000Z", "2026-11-03T18:30:00Z")).toBe(true);
    expect(sameValue(3, { id: 3, name: "Kavita" })).toBe(true);
    expect(sameValue(null, "")).toBe(true);
    expect(sameValue(26000, 25000)).toBe(false);
  });
});
