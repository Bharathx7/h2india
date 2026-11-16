import { z } from "zod";
import { trimChars } from "../text-checks";

// Attribute schemas (step 6.1, Taxonomy 636:596 and Add attribute 637:417). Pure, so the admin dialog, the product
// editor, the CSV import and the datasheet reader all check values with the same rules and the same words.
// One schema per category drives filters (filterable), compare and the table view (comparable), the spec table
// (display group and order) and the product form (required, test condition).

export const ATTRIBUTE_TYPES = ["number", "range", "text", "choice", "boolean"] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

/** The words in the Type column and the dialog's Type select (636:596). "Yes or no" is not drawn (A11). */
export const ATTRIBUTE_TYPE_LABEL: Record<AttributeType, string> = {
  number: "Number",
  range: "Range",
  text: "Text",
  choice: "Choice",
  boolean: "Yes or no",
};

/** The spec table groups drawn on 636:596 and 610:8. Operators can add a group in the dialog. */
export const DISPLAY_GROUPS = ["Performance", "Gas quality", "Physical"] as const;

export const ATTRIBUTE_LIMITS = { label: 60, unit: 20, hint: 60, testCondition: 60, group: 40, options: 50, text: 500 };

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  unit: string | null;
  min: number | null;
  max: number | null;
  options: string[];
  hint: string | null;
  required: boolean;
  filterable: boolean;
  comparable: boolean;
  testCondition: string | null;
  displayGroup: string;
  position: number;
}

const grouping = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 });

/** 5000 → "5,000", 99.9999 → "99.9999", Indian grouping for large numbers (1,00,000). */
export const formatNumber = (n: number): string => grouping.format(n);

/** What the Allowed values column shows: "1–5,000", "Oil-free, Oil-lubricated", "L × W", or "—". */
export function formatAllowedValues(def: Pick<AttributeDef, "type" | "min" | "max" | "options" | "hint">): string {
  switch (def.type) {
    case "number":
    case "range":
      if (def.min !== null && def.max !== null) return `${formatNumber(def.min)}–${formatNumber(def.max)}`;
      if (def.min !== null) return `${formatNumber(def.min)} or more`;
      if (def.max !== null) return `Up to ${formatNumber(def.max)}`;
      return "—";
    case "choice":
      return def.options.join(", ") || "—";
    case "text":
      return def.hint ?? "—";
    case "boolean":
      return "Yes, No";
  }
}

/** "Noise level" → "noise_level". The key is fixed once made; products keep their values under it. */
export function keyFromLabel(label: string): string {
  const key = label
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return trimChars(key, "_").slice(0, 48);
}

const NUMBER = String.raw`-?\d[\d,]*(?:\.\d+)?`;
const RANGE = new RegExp(String.raw`^\s*(${NUMBER})\s*(?:–|—|-|to)\s*(${NUMBER})\s*$`, "i");
const toNumber = (s: string) => Number(s.replace(/,/g, ""));

export type AllowedValues =
  { min: number | null; max: number | null; options: string[]; hint: string | null } | { error: string };

/** Reads the dialog's Allowed values box: "Min–max for numbers, or a comma-separated list for choices" (637:417). */
export function parseAllowedValues(type: AttributeType, text: string): AllowedValues {
  const raw = text.trim();
  const none = { min: null, max: null, options: [], hint: null };
  if (type === "number" || type === "range") {
    if (!raw) return none;
    const m = RANGE.exec(raw);
    if (!m?.[1] || !m[2]) return { error: "Enter the lowest and highest values, like 40–110" };
    const min = toNumber(m[1]);
    const max = toNumber(m[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max))
      return { error: "Enter the lowest and highest values, like 40–110" };
    if (min > max) return { error: "Put the lowest value first, like 40–110" };
    return { ...none, min, max };
  }
  if (type === "choice") {
    const options = [
      ...new Set(
        raw
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
      ),
    ];
    if (options.length < 2) return { error: "List at least two choices, separated by commas" };
    if (options.length > ATTRIBUTE_LIMITS.options)
      return { error: `List up to ${String(ATTRIBUTE_LIMITS.options)} choices` };
    if (options.some((o) => o.length > ATTRIBUTE_LIMITS.label)) {
      return { error: `Keep each choice to ${String(ATTRIBUTE_LIMITS.label)} characters` };
    }
    return { ...none, options };
  }
  if (type === "text") {
    if (raw.length > ATTRIBUTE_LIMITS.hint)
      return { error: `Keep this to ${String(ATTRIBUTE_LIMITS.hint)} characters` };
    return { ...none, hint: raw || null };
  }
  return none;
}

/** The dialog's fields (637:417), plus Comparable (not drawn, step 6.1 answer). */
export interface AttributeInput {
  label: string;
  type: string;
  unit: string;
  allowedValues: string;
  displayGroup: string;
  required: boolean;
  filterable: boolean;
  comparable: boolean;
  askTestCondition: boolean;
  testCondition: string;
}

export type CheckedAttribute = Omit<AttributeDef, "key" | "position">;

const isType = (t: string): t is AttributeType => (ATTRIBUTE_TYPES as readonly string[]).includes(t);

/** Checks the dialog. `otherLabels` are the category's other attributes, so two can't share a name or key. */
export function checkAttribute(
  input: AttributeInput,
  otherLabels: string[],
): { ok: true; value: CheckedAttribute } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const label = input.label.trim().replace(/\s+/g, " ");
  if (!label) errors.label = "Enter a name";
  else if (label.length > ATTRIBUTE_LIMITS.label)
    errors.label = `Keep the name to ${String(ATTRIBUTE_LIMITS.label)} characters`;
  else if (!keyFromLabel(label)) errors.label = "Use letters or numbers in the name";
  else if (otherLabels.some((o) => keyFromLabel(o) === keyFromLabel(label))) {
    errors.label = `This category already has an attribute called ${label}`;
  }
  if (!isType(input.type)) errors.type = "Choose a type";
  const unit = input.unit.trim();
  if (unit.length > ATTRIBUTE_LIMITS.unit) errors.unit = `Keep the unit to ${String(ATTRIBUTE_LIMITS.unit)} characters`;
  const allowed = isType(input.type) ? parseAllowedValues(input.type, input.allowedValues) : null;
  if (allowed && "error" in allowed) errors.allowedValues = allowed.error;
  const displayGroup = input.displayGroup.trim();
  if (!displayGroup) errors.displayGroup = "Choose a display group";
  else if (displayGroup.length > ATTRIBUTE_LIMITS.group) {
    errors.displayGroup = `Keep the group name to ${String(ATTRIBUTE_LIMITS.group)} characters`;
  }
  const testCondition = input.askTestCondition ? input.testCondition.trim() : "";
  if (input.askTestCondition && !testCondition) errors.testCondition = "Enter the test condition, like At 1 m";
  else if (testCondition.length > ATTRIBUTE_LIMITS.testCondition) {
    errors.testCondition = `Keep this to ${String(ATTRIBUTE_LIMITS.testCondition)} characters`;
  }
  if (Object.keys(errors).length || !allowed || "error" in allowed || !isType(input.type)) return { ok: false, errors };
  const type = input.type;
  return {
    ok: true,
    value: {
      label,
      type,
      // Choices and yes-or-no values have no unit.
      unit: type === "choice" || type === "boolean" ? null : unit || null,
      ...allowed,
      required: input.required,
      filterable: input.filterable,
      comparable: input.comparable,
      testCondition: testCondition || null,
      displayGroup,
    },
  };
}

/**
 * Changing an attribute's type or unit after products use it would change what their stored values mean, so it
 * needs a data migration instead (step 6.1 watch-out). Labels, groups, order and the switches can change freely.
 */
export function changeNeedsMigration(
  before: Pick<AttributeDef, "type" | "unit">,
  after: Pick<AttributeDef, "type" | "unit">,
  productsUsingIt: number,
): string | null {
  if (productsUsingIt === 0) return null;
  if (before.type !== after.type || (before.unit ?? "") !== (after.unit ?? "")) {
    return "Products already use this attribute, so its type and unit can't change here. Ask the engineering team for a data migration.";
  }
  return null;
}

const describe = (d: AttributeDef) => {
  const unit = d.unit ? ` ${d.unit}` : "";
  if (d.min !== null && d.max !== null) {
    return `${d.label} must be between ${formatNumber(d.min)} and ${formatNumber(d.max)}${unit}`;
  }
  if (d.min !== null) return `${d.label} must be at least ${formatNumber(d.min)}${unit}`;
  return `${d.label} must be at most ${formatNumber(d.max ?? 0)}${unit}`;
};

function numberFor(d: AttributeDef) {
  let s = z.number({ error: `${d.label} must be a number` });
  if (d.min !== null) s = s.min(d.min, { error: describe(d) });
  if (d.max !== null) s = s.max(d.max, { error: describe(d) });
  return s;
}

function valueSchema(d: AttributeDef): z.ZodType {
  switch (d.type) {
    case "number":
      return numberFor(d);
    case "range":
      return z
        .object({ min: numberFor(d), max: numberFor(d) })
        .strict()
        .refine((r) => r.min <= r.max, { error: `${d.label}: put the lowest value first` });
    case "choice":
      return z.enum(d.options as [string, ...string[]], {
        error: `${d.label} must be one of: ${d.options.join(", ")}`,
      });
    case "boolean":
      return z.boolean({ error: `${d.label} must be yes or no` });
    case "text":
      return z
        .string({ error: `${d.label} must be text` })
        .trim()
        .min(1, { error: `Enter ${d.label.toLowerCase()}` })
        .max(ATTRIBUTE_LIMITS.text, {
          error: `Keep ${d.label.toLowerCase()} to ${String(ATTRIBUTE_LIMITS.text)} characters`,
        });
  }
}

/**
 * The category's schema as a Zod object, built at runtime from its definitions, so an operator's change applies
 * without a deploy. Unknown attributes are refused; a missing required one says which.
 */
export function schemaFor(defs: readonly AttributeDef[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const d of defs) {
    const s = valueSchema(d);
    shape[d.key] = d.required ? s : s.optional();
  }
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `This category has no attribute called ${issue.keys.join(", ")}`
        : issue.input === undefined
          ? "Enter the product's specifications"
          : undefined,
  });
}

/** Checks a product's attribute values. Messages are keyed by attribute, ready for the form or the import report. */
export function checkAttributeValues(
  defs: readonly AttributeDef[],
  values: unknown,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const result = schemaFor(defs).safeParse(values);
  if (result.success) return { ok: true, value: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = typeof issue.path[0] === "string" ? issue.path[0] : "";
    const def = byKey.get(key);
    // A missing required value reports as a type error on undefined; say it plainly.
    const message =
      def && issue.code === "invalid_type" && issue.input === undefined
        ? `Enter ${def.label.toLowerCase()}`
        : issue.message;
    if (issue.code === "unrecognized_keys") {
      for (const k of issue.keys) errors[k] = `This category has no attribute called ${k}`;
    } else errors[key || "_"] ??= message;
  }
  return { ok: false, errors };
}
