// What a content form shows (step 4.6): a collection's Payload fields as plain data the native editor renders with our
// components. Functions (hooks, validation, conditions) stay on the server, where Payload runs them on save.
// Pure: unit-tested.

export type FieldKind =
  | "text"
  | "email"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "relationship"
  | "upload"
  | "array"
  | "group"
  | "richText"
  | "json"
  /** A link to a record of one of several types, set by the system (Possible updates, Tracker changes): shown, not edited. */
  | "reference"
  | "unsupported";

export interface FieldSpec {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  readOnly: boolean;
  sidebar: boolean;
  description?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Date fields: with a time of day (shown and entered in IST). */
  withTime?: boolean;
  options?: { value: string; label: string }[];
  hasMany?: boolean;
  /** Relationship and upload: the collection it points to. */
  relationTo?: string;
  fields?: FieldSpec[];
  /** Drawn inside a card that already carries its label: the label is for screen readers only. */
  bare?: boolean;
}

/** Fields Payload adds for its own bookkeeping, or for uploaded files; never edited by hand. */
const SKIP = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "_status",
  "url",
  "thumbnailURL",
  "filename",
  "mimeType",
  "filesize",
  "width",
  "height",
  "focalX",
  "focalY",
  "sizes",
  "prefix",
]);

type Raw = Record<string, unknown> & { type?: string; name?: string; fields?: Raw[]; admin?: Record<string, unknown> };

/** "sourceUrl" → "Source url". */
export function labelOf(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const text = (v: unknown): string | undefined =>
  typeof v === "string"
    ? v
    : v && typeof v === "object" && typeof (v as { en?: unknown }).en === "string"
      ? (v as { en: string }).en
      : undefined;

function optionsOf(raw: unknown): { value: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o: unknown) =>
    typeof o === "string"
      ? { value: o, label: o }
      : {
          value: String((o as { value: unknown }).value),
          label: text((o as { label?: unknown }).label) ?? String((o as { value: unknown }).value),
        },
  );
}

const KINDS: Record<string, FieldKind> = {
  text: "text",
  email: "email",
  textarea: "textarea",
  number: "number",
  date: "date",
  select: "select",
  radio: "radio",
  checkbox: "checkbox",
  relationship: "relationship",
  upload: "upload",
  array: "array",
  group: "group",
  richText: "richText",
  json: "json",
};

export function describeFields(fields: readonly unknown[], inSidebar = false, nested = false): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const f of fields as Raw[]) {
    const admin = f.admin ?? {};
    if (f.hidden === true || admin.hidden === true || f.virtual === true || f.type === "ui") continue;
    // Rows and collapsibles only arrange fields: their fields sit at this level.
    if ((f.type === "row" || f.type === "collapsible") && Array.isArray(f.fields)) {
      out.push(...describeFields(f.fields, inSidebar || admin.position === "sidebar", nested));
      continue;
    }
    if (f.type === "tabs" && Array.isArray(f.tabs)) {
      for (const tab of f.tabs as Raw[]) {
        const inner = describeFields(tab.fields ?? [], inSidebar, nested);
        if (typeof tab.name === "string")
          out.push({
            name: tab.name,
            label: text(tab.label) ?? labelOf(tab.name),
            kind: "group",
            required: false,
            readOnly: false,
            sidebar: inSidebar,
            fields: inner,
          });
        else out.push(...inner);
      }
      continue;
    }
    if (typeof f.name !== "string" || (!nested && SKIP.has(f.name)) || f.name === "id") continue;
    const kind = KINDS[f.type ?? ""] ?? "unsupported";
    const relationTo = typeof f.relationTo === "string" ? f.relationTo : undefined;
    const spec: FieldSpec = {
      name: f.name,
      label: text(f.label) ?? labelOf(f.name),
      // A relationship to several collections at once is set by the system: shown as a link to the record.
      kind: (kind === "relationship" || kind === "upload") && !relationTo ? "reference" : kind,
      required: f.required === true,
      readOnly: admin.readOnly === true,
      sidebar: inSidebar || admin.position === "sidebar",
    };
    const description = text(admin.description);
    if (description) spec.description = description;
    if (typeof f.maxLength === "number") spec.maxLength = f.maxLength;
    if (typeof f.min === "number") spec.min = f.min;
    if (typeof f.max === "number") spec.max = f.max;
    if (kind === "date") {
      const picker = (admin.date as { pickerAppearance?: string } | undefined)?.pickerAppearance;
      spec.withTime = picker === "dayAndTime" || picker === "timeOnly";
    }
    if (kind === "select" || kind === "radio") spec.options = optionsOf(f.options);
    if (f.hasMany === true) spec.hasMany = true;
    if (relationTo) spec.relationTo = relationTo;
    if ((kind === "array" || kind === "group") && Array.isArray(f.fields))
      spec.fields = describeFields(f.fields, false, true);
    out.push(spec);
  }
  return out;
}

/** The collections a form points to, so the page can load their choices. */
export function relationsOf(fields: FieldSpec[]): string[] {
  const out = new Set<string>();
  const walk = (list: FieldSpec[]) => {
    for (const f of list) {
      if (f.relationTo) out.add(f.relationTo);
      // Rich text can hold pictures from the media library (Image blocks).
      if (f.kind === "richText") out.add("media");
      if (f.fields) walk(f.fields);
    }
  };
  walk(fields);
  return [...out];
}

/** Turns a form's values back into what Payload stores: empty strings become null, numbers become numbers. */
export function toStored(fields: FieldSpec[], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.readOnly || f.kind === "unsupported" || f.kind === "reference") continue;
    if (!(f.name in values)) continue;
    const v = values[f.name];
    switch (f.kind) {
      case "text":
      case "email":
      case "textarea":
        out[f.name] = typeof v === "string" && v.trim() === "" ? null : v;
        break;
      case "number":
        out[f.name] = v === "" || v === null || v === undefined ? null : Number(v);
        break;
      case "date":
      case "select":
      case "radio":
        out[f.name] = f.hasMany ? (Array.isArray(v) ? v : []) : v === "" ? null : v;
        break;
      case "group":
        // Values the form doesn't show are kept as they were.
        out[f.name] =
          v && typeof v === "object"
            ? { ...(v as Record<string, unknown>), ...toStored(f.fields ?? [], v as Record<string, unknown>) }
            : v;
        break;
      case "array":
        out[f.name] = Array.isArray(v)
          ? v.map((row: Record<string, unknown>) => ({ ...row, ...toStored(f.fields ?? [], row) }))
          : [];
        break;
      default:
        out[f.name] = v;
    }
  }
  return out;
}
