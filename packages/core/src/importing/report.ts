// The shape of every import report (step 4.6): one line per row, so a person can fix the file row by row. Safe to
// import anywhere.

export type RowAction = "create" | "update" | "unchanged" | "error";

export interface RowResult {
  /** Row number as in the file: 2 is the first data row of a CSV (row 1 is the header); 1 is the first JSON item. */
  row: number;
  key: string;
  action: RowAction;
  errors: string[];
}

export interface ImportReport {
  type: string;
  applied: boolean;
  rows: RowResult[];
  counts: Record<RowAction, number>;
}

export function summarise(type: string, applied: boolean, rows: RowResult[]): ImportReport {
  const counts: Record<RowAction, number> = { create: 0, update: 0, unchanged: 0, error: 0 };
  for (const r of rows) counts[r.action] += 1;
  return { type, applied, rows, counts };
}

/** The printed report: counts, then every row with a problem, then what would change. */
export function formatReport(report: ImportReport): string {
  const verb = report.applied ? "Imported" : "Dry run (nothing changed)";
  const c = report.counts;
  const lines = [
    `${verb} · ${report.type}: ${String(c.create)} to create, ${String(c.update)} to update, ${String(c.unchanged)} unchanged, ${String(c.error)} with problems`,
  ];
  for (const r of report.rows.filter((x) => x.action === "error")) {
    for (const e of r.errors) lines.push(`  row ${String(r.row)} (${r.key || "no key"}): ${e}`);
  }
  for (const r of report.rows.filter((x) => x.action === "create" || x.action === "update")) {
    lines.push(`  row ${String(r.row)} · ${r.action} · ${r.key}`);
  }
  if (!report.applied && c.error === 0 && c.create + c.update > 0) lines.push("Run again with --apply to write.");
  if (!report.applied && c.error > 0)
    lines.push("Fix the problems above; nothing is written while any row has a problem.");
  return lines.join("\n");
}
