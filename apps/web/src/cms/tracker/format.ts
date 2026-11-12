// How tracker values read in Recent changes, on record pages and in the preview (step 4.5). Pure: tested on its own.

const IST = "Asia/Kolkata";

/** Indian digit grouping: 140000 → "1,40,000"; decimals kept as given. */
export function indianNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

/** "May 2026" (status dates are month precision). */
export function monthYear(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: IST }).format(new Date(iso));
}

/** "4 Oct 2026". */
export function dayMonthYear(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST }).format(
    new Date(iso),
  );
}

/** Paise per kg → "397.00". */
export function rupeesFromPaise(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const rest = Math.abs(paise % 100);
  return `${indianNumber(whole)}.${String(rest).padStart(2, "0")}`;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : JSON.stringify(value);
}

export type FieldKind = "text" | "number" | "month" | "day" | "list" | "paise";

/** One value as shown; empty values read "—" as on 740:841. */
export function formatValue(value: unknown, kind: FieldKind = "text"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    const parts = value.filter((v) => v !== null && v !== undefined && v !== "").map((v) => formatValue(v, "number"));
    return parts.length ? parts.join(" / ") : "—";
  }
  switch (kind) {
    case "number":
      return typeof value === "number" ? indianNumber(value) : textOf(value);
    case "paise":
      return typeof value === "number" ? rupeesFromPaise(value) : textOf(value);
    case "month":
      return monthYear(value as string);
    case "day":
      return dayMonthYear(value as string);
    default:
      return typeof value === "string" ? value.trim() || "—" : JSON.stringify(value);
  }
}

export interface TrackedField {
  /** Field name on the record (dot path for groups). */
  name: string;
  /** The column header or record-field label as drawn, for example "Capacity (t/yr)". */
  label: string;
  kind?: FieldKind;
  /** A unit shown after the value on record pages, for example "t/yr". */
  unit?: string;
}

export function readPath(doc: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((v, key) => (v && typeof v === "object" ? (v as Record<string, unknown>)[key] : undefined), doc);
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

/** What changed between two published states of a record, one entry per tracked field, in the tracked order. */
export function diffRecord(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  tracked: TrackedField[],
): FieldChange[] {
  if (!before) return [{ field: "Record", before: "—", after: "Added" }];
  const changes: FieldChange[] = [];
  for (const f of tracked) {
    const b = formatValue(readPath(before, f.name), f.kind);
    const a = formatValue(readPath(after, f.name), f.kind);
    if (a !== b) changes.push({ field: f.label, before: b, after: a });
  }
  return changes;
}
