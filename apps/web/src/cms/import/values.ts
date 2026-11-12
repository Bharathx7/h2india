import { listOf, yesNo } from "@h2india/core/importing";

// Turning a cell into a field value (step 4.6). Pure: tested on its own. Dates without a zone are India time.

export type Converted = { value: unknown } | { error: string };

const IST = "+05:30";

/** "2026-11-04", "2026-11-04 15:00", "2026-11" or a full ISO time → ISO in UTC. */
export function parseDate(text: string): string | null {
  const t = text.trim();
  let iso: string | null = null;
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(t)) iso = t;
  else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(t)) iso = `${t.replace(" ", "T")}:00${IST}`;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(t)) iso = `${t}T00:00:00${IST}`;
  else if (/^\d{4}-\d{2}$/.test(t)) iso = `${t}-01T00:00:00${IST}`;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const asText = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Converts one cell for a field of the given type. Blank clears the value (validation reports required fields). */
export function convertCell(type: string, hasMany: boolean, raw: unknown): Converted {
  if (isBlank(raw)) return { value: hasMany ? [] : null };
  switch (type) {
    case "text":
    case "textarea":
    case "email":
    case "code":
    case "select":
    case "radio":
      return { value: hasMany ? listOf(raw) : asText(raw) };
    case "number": {
      const parts = hasMany ? listOf(raw) : [raw];
      const nums = parts.map((p) => (typeof p === "number" ? p : Number(asText(p).replace(/,/g, ""))));
      if (nums.some((n) => !Number.isFinite(n))) return { error: "a number" };
      return { value: hasMany ? nums : nums[0] };
    }
    case "checkbox": {
      const b = yesNo(raw);
      return b === null ? { error: "yes or no" } : { value: b };
    }
    case "date": {
      if (typeof raw !== "string") return { error: "a date like 2026-11-04" };
      const iso = parseDate(raw);
      return iso ? { value: iso } : { error: "a date like 2026-11-04 (India time)" };
    }
    case "json":
    case "array":
    case "group":
      if (typeof raw !== "string") return { value: raw };
      try {
        const parsed: unknown = JSON.parse(raw);
        return { value: parsed };
      } catch {
        return { error: 'JSON, for example [{"name": "…"}]' };
      }
    default:
      return { error: `this kind of field (${type}) can't be imported; fill it in /cms` };
  }
}

/**
 * Compares a value about to be written with what is stored, ignoring representation differences: ids on stored
 * array items and links, empty versus missing, date formats, and stored keys the file does not mention.
 */
export function sameValue(next: unknown, stored: unknown): boolean {
  const empty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
  if (empty(next)) return empty(stored);
  if (Array.isArray(next)) {
    return Array.isArray(stored) && stored.length === next.length && next.every((n, i) => sameValue(n, stored[i]));
  }
  if (next && typeof next === "object") {
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return false;
    const s = stored as Record<string, unknown>;
    return Object.entries(next as Record<string, unknown>).every(([k, v]) => k === "id" || sameValue(v, s[k]));
  }
  if (stored && typeof stored === "object" && !Array.isArray(stored) && "id" in stored)
    return sameValue(next, stored.id);
  const date = (v: unknown) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) && !Number.isNaN(Date.parse(v))
      ? new Date(v).toISOString()
      : v;
  return date(next) === date(stored);
}
