import { describe, expect, it } from "vitest";
import {
  changeNeedsMigration,
  checkAttribute,
  checkAttributeValues,
  formatAllowedValues,
  keyFromLabel,
  parseAllowedValues,
  type AttributeDef,
  type AttributeInput,
} from "./attributes";

// Step 6.1 DONE WHEN: a product with a value outside an attribute's range is rejected with a clear message.

const def = (over: Partial<AttributeDef> & Pick<AttributeDef, "key" | "label" | "type">): AttributeDef => ({
  unit: null,
  min: null,
  max: null,
  options: [],
  hint: null,
  required: false,
  filterable: false,
  comparable: false,
  testCondition: null,
  displayGroup: "Physical",
  position: 0,
  ...over,
});

// Diaphragm compressors as drawn on 636:596.
const DIAPHRAGM: AttributeDef[] = [
  def({ key: "flow_rate", label: "Flow rate", type: "number", unit: "Nm³/h", min: 1, max: 5000, required: true }),
  def({
    key: "suction_pressure",
    label: "Suction pressure",
    type: "range",
    unit: "bar g",
    min: 0,
    max: 200,
    required: true,
  }),
  def({
    key: "hydrogen_purity",
    label: "Hydrogen purity",
    type: "number",
    unit: "%",
    min: 99,
    max: 99.9999,
    required: true,
  }),
  def({
    key: "lubrication",
    label: "Lubrication",
    type: "choice",
    options: ["Oil-free", "Oil-lubricated"],
    required: true,
  }),
  def({ key: "footprint", label: "Footprint", type: "text", unit: "m", hint: "L × W" }),
  def({ key: "noise_level", label: "Noise level", type: "number", unit: "dB(A)", min: 40, max: 110 }),
];

const good = {
  flow_rate: 120,
  suction_pressure: { min: 20, max: 30 },
  hydrogen_purity: 99.999,
  lubrication: "Oil-free",
};

describe("schemaFor", () => {
  it("accepts a product that fits the schema", () => {
    expect(checkAttributeValues(DIAPHRAGM, { ...good, footprint: "3.2 × 1.8" }).ok).toBe(true);
    // Optional attributes can be left out.
    expect(checkAttributeValues(DIAPHRAGM, good).ok).toBe(true);
  });

  it("rejects a value outside the allowed range with a clear message", () => {
    const r = checkAttributeValues(DIAPHRAGM, { ...good, flow_rate: 6000, noise_level: 20 });
    expect(r.ok ? null : r.errors).toEqual({
      flow_rate: "Flow rate must be between 1 and 5,000 Nm³/h",
      noise_level: "Noise level must be between 40 and 110 dB(A)",
    });
  });

  it("says which required attribute is missing", () => {
    const rest: Partial<typeof good> = { ...good };
    delete rest.flow_rate;
    const r = checkAttributeValues(DIAPHRAGM, rest);
    expect(r.ok ? null : r.errors).toEqual({ flow_rate: "Enter flow rate" });
  });

  it("refuses unknown attributes, wrong choices and upside-down ranges", () => {
    const r = checkAttributeValues(DIAPHRAGM, {
      ...good,
      lubrication: "Grease",
      suction_pressure: { min: 30, max: 20 },
      price: 1250000,
    });
    expect(r.ok ? null : r.errors).toEqual({
      lubrication: "Lubrication must be one of: Oil-free, Oil-lubricated",
      suction_pressure: "Suction pressure: put the lowest value first",
      price: "This category has no attribute called price",
    });
  });

  it("checks both ends of a range against the allowed values", () => {
    const r = checkAttributeValues(DIAPHRAGM, { ...good, suction_pressure: { min: 20, max: 250 } });
    expect(r.ok ? null : r.errors).toEqual({ suction_pressure: "Suction pressure must be between 0 and 200 bar g" });
  });

  it("keeps decimals in the allowed range", () => {
    const r = checkAttributeValues(DIAPHRAGM, { ...good, hydrogen_purity: 98.5 });
    expect(r.ok ? null : r.errors).toEqual({ hydrogen_purity: "Hydrogen purity must be between 99 and 99.9999 %" });
  });
});

describe("allowed values", () => {
  it("reads min–max and comma lists as the dialog's hint says", () => {
    expect(parseAllowedValues("number", "40–110")).toEqual({ min: 40, max: 110, options: [], hint: null });
    expect(parseAllowedValues("number", "1-5,000")).toEqual({ min: 1, max: 5000, options: [], hint: null });
    expect(parseAllowedValues("range", "0 to 200")).toEqual({ min: 0, max: 200, options: [], hint: null });
    expect(parseAllowedValues("number", "")).toEqual({ min: null, max: null, options: [], hint: null });
    expect(parseAllowedValues("choice", "Water, Air, Water")).toEqual({
      min: null,
      max: null,
      options: ["Water", "Air"],
      hint: null,
    });
    expect(parseAllowedValues("text", "L × W")).toEqual({ min: null, max: null, options: [], hint: "L × W" });
  });

  it("explains what is wrong", () => {
    expect(parseAllowedValues("number", "loud")).toEqual({ error: "Enter the lowest and highest values, like 40–110" });
    expect(parseAllowedValues("number", "110–40")).toEqual({ error: "Put the lowest value first, like 40–110" });
    expect(parseAllowedValues("choice", "Water")).toEqual({ error: "List at least two choices, separated by commas" });
  });

  it("shows them as the table does", () => {
    expect(formatAllowedValues({ type: "number", min: 1, max: 5000, options: [], hint: null })).toBe("1–5,000");
    expect(formatAllowedValues({ type: "number", min: 99, max: 99.9999, options: [], hint: null })).toBe("99–99.9999");
    expect(formatAllowedValues({ type: "number", min: 10, max: 100000, options: [], hint: null })).toBe("10–1,00,000");
    expect(formatAllowedValues({ type: "choice", min: null, max: null, options: ["Water", "Air"], hint: null })).toBe(
      "Water, Air",
    );
    expect(formatAllowedValues({ type: "text", min: null, max: null, options: [], hint: "L × W" })).toBe("L × W");
  });
});

describe("the Add attribute dialog", () => {
  const input = (over: Partial<AttributeInput> = {}): AttributeInput => ({
    label: "Noise level",
    type: "number",
    unit: "dB(A)",
    allowedValues: "40–110",
    displayGroup: "Physical",
    required: false,
    filterable: false,
    comparable: false,
    askTestCondition: true,
    testCondition: "At 1 m",
    ...over,
  });

  it("accepts the drawn example", () => {
    const r = checkAttribute(input(), ["Flow rate", "Weight"]);
    expect(r.ok && r.value).toMatchObject({ label: "Noise level", min: 40, max: 110, testCondition: "At 1 m" });
    expect(keyFromLabel("Noise level")).toBe("noise_level");
    expect(keyFromLabel("H₂ output (kg/day)")).toBe("h2_output_kgday");
  });

  it("refuses a duplicate name, a missing group and an empty test condition", () => {
    const r = checkAttribute(input({ label: "noise  Level", displayGroup: "", testCondition: " " }), ["Noise level"]);
    expect(r.ok ? null : r.errors).toEqual({
      label: "This category already has an attribute called noise Level",
      displayGroup: "Choose a display group",
      testCondition: "Enter the test condition, like At 1 m",
    });
  });

  it("drops the unit for choices", () => {
    const r = checkAttribute(
      input({ type: "choice", unit: "x", allowedValues: "Water, Air", askTestCondition: false }),
      [],
    );
    expect(r.ok && r.value.unit).toBeNull();
  });
});

describe("changing an attribute in use", () => {
  it("allows any change before products use it, and refuses type or unit changes after", () => {
    expect(changeNeedsMigration({ type: "number", unit: "kg" }, { type: "text", unit: "t" }, 0)).toBeNull();
    expect(changeNeedsMigration({ type: "number", unit: "kg" }, { type: "number", unit: "kg" }, 41)).toBeNull();
    expect(changeNeedsMigration({ type: "number", unit: "kg" }, { type: "number", unit: "t" }, 41)).toMatch(
      /can't change here/,
    );
  });
});
