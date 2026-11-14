import { describe, expect, it } from "vitest";
import { initials, istDay, istDayTime, searchHelp } from "./views";

const article = (title: string, keywords: string[] = []) => ({
  title,
  intro: "How to do it.",
  category: "payments" as const,
  keywords,
  sections: [],
});

describe("help search", () => {
  const list = [article("Paying by NEFT or RTGS", ["bank transfer"]), article("Downloading GST invoices")];
  it("needs every word, in the title, intro or keywords", () => {
    expect(searchHelp(list, "GST invoice").map((a) => a.title)).toEqual(["Downloading GST invoices"]);
    expect(searchHelp(list, "bank transfer").map((a) => a.title)).toEqual(["Paying by NEFT or RTGS"]);
    expect(searchHelp(list, "liquid hydrogen trailer")).toEqual([]);
    expect(searchHelp(list, " ")).toEqual([]);
  });
});

describe("formatting", () => {
  it("shows India dates and initials", () => {
    expect(istDay("2026-11-10T16:10:00Z")).toBe("10 Nov 2026");
    expect(istDayTime("2026-11-10T16:10:00Z")).toBe("10 Nov 2026, 9:40 PM");
    expect(initials("Aditi Deshpande")).toBe("AD");
    expect(initials("Imran")).toBe("I");
  });
});
