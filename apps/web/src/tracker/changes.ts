import type { TrackerChange } from "../payload-types";

// Recent changes filters (740:841): view, kind of change and period. Pure, shared by the page and its CSV.

export const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];
export const CHANGE_KINDS = [
  { value: "added", label: "Records added" },
  { value: "status", label: "Status changes" },
  { value: "figures", label: "Figures and details" },
];

export function changeKind(c: Pick<TrackerChange, "field">): string {
  if (c.field === "Record") return "added";
  if (c.field === "Status" || c.field === "Status date") return "status";
  return "figures";
}

export function filterChanges(list: TrackerChange[], kind: string): TrackerChange[] {
  return kind ? list.filter((c) => changeKind(c) === kind) : list;
}

export function changesCsv(list: TrackerChange[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = list.map((c) => [
    c.at.slice(0, 10),
    c.recordTitle,
    c.view,
    c.field,
    c.before ?? "",
    c.after ?? "",
    c.source ?? "",
    c.sourceUrl ?? "",
  ]);
  return [["Date", "Record", "View", "Field", "Before", "After", "Source", "Source link"], ...rows]
    .map((r) => r.map((x) => esc(x)).join(","))
    .join("\n")
    .concat("\n");
}
