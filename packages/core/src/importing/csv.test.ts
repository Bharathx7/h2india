import { describe, expect, it } from "vitest";
import { listOf, parseCsv, parseImportFile, yesNo } from "./csv";
import { formatReport, summarise } from "./report";

describe("import files", () => {
  it("reads CSV with quotes, commas and line breaks inside values", () => {
    const text =
      'slug,term,short\r\nrfs,RfS,"Request for Selection, the ""tender"" document"\nalk,Alkaline,"two\nlines"\n\n';
    expect(parseCsv(text)).toEqual([
      { slug: "rfs", term: "RfS", short: 'Request for Selection, the "tender" document' },
      { slug: "alk", term: "Alkaline", short: "two\nlines" },
    ]);
    expect(() => parseCsv('a,b\n"open,1')).toThrow("closing quote");
  });

  it("reads JSON arrays and refuses anything else", () => {
    expect(parseImportFile("x.json", '[{"slug":"a"}]')).toEqual([{ slug: "a" }]);
    expect(() => parseImportFile("x.json", '{"slug":"a"}')).toThrow("array");
  });

  it("splits lists and reads yes/no", () => {
    expect(listOf("Manufacturer; Services ;")).toEqual(["Manufacturer", "Services"]);
    expect(listOf(["a", " b "])).toEqual(["a", "b"]);
    expect(yesNo("Yes")).toBe(true);
    expect(yesNo("")).toBe(false);
    expect(yesNo("maybe")).toBeNull();
  });

  it("reports problems by row and refuses to write while any row has one", () => {
    const report = summarise("glossary", false, [
      { row: 2, key: "rfs", action: "create", errors: [] },
      { row: 3, key: "", action: "error", errors: ["short: required"] },
    ]);
    expect(report.counts).toEqual({ create: 1, update: 0, unchanged: 0, error: 1 });
    expect(formatReport(report)).toContain("row 3 (no key): short: required");
    expect(formatReport(report)).toContain("nothing is written while any row has a problem");
  });
});
