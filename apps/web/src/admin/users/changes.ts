// "Old → new" for an audit entry (656:872): the status when there is one, otherwise the first field that changed.
// Values the audit log masked stay masked. Pure.

const show = (v: unknown): string =>
  v === null || v === undefined
    ? "none"
    : typeof v === "string"
      ? v
      : typeof v === "number" || typeof v === "boolean"
        ? String(v)
        : JSON.stringify(v).slice(0, 40);

export function oldToNew(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string {
  const b = before ?? {};
  const a = after ?? {};
  if ("status" in a || "status" in b) return `${show(b.status)} → ${show(a.status)}`;
  const key = [...new Set([...Object.keys(b), ...Object.keys(a)])].find((k) => show(b[k]) !== show(a[k]));
  if (!key) return "—";
  const label = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${show(b[key])} → ${show(a[key])}`;
}
