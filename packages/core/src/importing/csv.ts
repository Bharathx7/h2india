// A small CSV reader for import files (RFC 4180: commas, quoted fields with "" for a quote, line breaks inside
// quotes). The first line is the header. Safe to import anywhere.

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (input.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input.charAt(i + 1) === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("The file ends inside a quoted value: a closing quote is missing.");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  const [header, ...data] = nonEmpty;
  if (!header) return [];
  const names = header.map((h) => h.trim());
  return data.map((r) => Object.fromEntries(names.map((n, idx) => [n, (r[idx] ?? "").trim()])));
}

/** Reads a CSV or JSON import file's text by its name. JSON is an array of objects. */
export function parseImportFile(name: string, text: string): Record<string, unknown>[] {
  if (name.toLowerCase().endsWith(".json")) {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("A JSON import file holds an array of rows.");
    return data.map((r, i) => {
      if (!r || typeof r !== "object" || Array.isArray(r)) throw new Error(`Item ${String(i + 1)} is not an object.`);
      return r as Record<string, unknown>;
    });
  }
  return parseCsv(text);
}

/** "Manufacturer; Services" or ["Manufacturer", "Services"] → a list. */
export function listOf(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map((v) => (typeof v === "string" ? v.trim() : JSON.stringify(v))).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** yes/no, true/false, 1/0 (empty is no). */
export function yesNo(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const v = (typeof value === "string" ? value : typeof value === "number" ? String(value) : "").trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0", ""].includes(v)) return false;
  return null;
}
