import { describe, expect, it } from "vitest";
import { sniffType } from "../files/sniff";
import type { AttributeDef } from "../catalogue/attributes";
import { parseImport, templateCsv } from "./import";

const def = (o: Partial<AttributeDef>): AttributeDef => ({
  key: "k",
  label: "K",
  type: "number",
  unit: null,
  min: null,
  max: null,
  options: [],
  hint: null,
  required: false,
  filterable: false,
  comparable: false,
  testCondition: null,
  displayGroup: "Performance",
  position: 0,
  ...o,
});

const defs = [
  def({ key: "outlet_pressure", label: "Outlet pressure", unit: "bar", required: true, min: 1, max: 1000 }),
  def({ key: "cooling", label: "Cooling", type: "choice", options: ["Water", "Air"] }),
];

describe("bulk import (607:9)", () => {
  it("makes a template from the category, marking required columns", () => {
    expect(templateCsv(defs).split("\n")[0]).toContain("outlet_pressure (bar) *");
    expect(templateCsv(defs).split("\n")[0]?.startsWith("sku *,name *")).toBe(true);
  });

  it("reports problems by row and column, as drawn", () => {
    const text = [
      "sku *,name *,outlet_pressure (bar) *,cooling",
      "PDC-500,Diaphragm compressor,500,Water",
      "PDC-410,Compressor 410,approx 400,Water",
      "PDC-HP,Compressor HP,700,Oil",
      "PDC-500,Duplicate,500,Air",
    ].join("\n");
    const { rows, fileError } = parseImport(text, defs);
    expect(fileError).toBeUndefined();
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.data.attributes).toEqual({ outlet_pressure: 500, cooling: "Water" });
    expect(rows[1]).toMatchObject({ row: 3, sku: "PDC-410" });
    expect(rows[1]?.errors[0]?.message).toBe(
      'Outlet pressure: "approx 400" isn\'t a number. Enter 400 and put the unit in its own column.',
    );
    expect(rows[2]?.errors[0]?.message).toBe("Cooling: use one of the allowed values, Water or Air");
    expect(rows[3]?.errors[0]?.message).toBe("This SKU is already in the file");
  });

  it("refuses a file whose columns don't match", () => {
    expect(parseImport("sku,name,flux_capacitor\nA,B,1", defs).fileError).toBe("Columns don't match the template");
  });

  it("recognises a CSV by its content, and nothing else as one", () => {
    expect(sniffType(new TextEncoder().encode("sku,name\nA,B\n"))).toBe("text/csv");
    expect(sniffType(new Uint8Array([0x00, 0x2c, 0x01]))).toBeNull();
  });
});
