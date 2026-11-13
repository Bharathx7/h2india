import { describe, expect, it } from "vitest";
import { alertChips, countWords, defaultAlertLabel, deliveryWords, filterExpression } from "./rules";

describe("alert rules", () => {
  it("builds filters only from allowed fields, quoted", () => {
    expect(filterExpression("tenders", { states: ["Gujarat", "Odisha"], price: ["1"], topics: [] })).toEqual([
      '(states = "Gujarat" OR states = "Odisha")',
    ]);
    // A value can't break out of its quotes.
    expect(filterExpression("tenders", { states: ['x" OR id = "y'] })).toEqual(['(states = "x\\" OR id = \\"y")']);
  });

  it("reads like the cards on 534:8", () => {
    expect(alertChips("tenders", { states: ["Gujarat"] })).toEqual(["Gujarat"]);
    expect(alertChips("schemes", {})).toEqual(["All of India"]);
    expect(alertChips("articles", {})).toEqual([]);
    expect(alertChips("tenders", { id: ["12"] })).toEqual(["This tender only"]);
    expect(deliveryWords("daily", ["email"])).toBe("Daily · email");
    expect(deliveryWords("instant", ["whatsapp"])).toBe("Instant · WhatsApp");
    expect(deliveryWords("weekly", ["email", "inapp"])).toBe("Weekly · email and in-app");
    expect(defaultAlertLabel("tenders", "electrolysers EPC")).toBe("Tenders · Electrolysers + EPC");
    expect(countWords("tenders", 1)).toBe("1 tender");
    expect(countWords("schemes", 5)).toBe("5 schemes");
  });
});
