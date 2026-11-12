import type { FieldHook } from "payload";

/** "Running a 1 MW electrolyser in Kutch" → "running-a-1-mw-electrolyser-in-kutch" */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Fills the slug from a field (usually the title) when it's empty. */
export function slugFrom(field: string): FieldHook {
  return ({ value, data }): string | undefined => {
    if (typeof value === "string" && value.trim()) return slugify(value);
    const source = (data as Record<string, unknown> | undefined)?.[field];
    return typeof source === "string" ? slugify(source) : undefined;
  };
}
