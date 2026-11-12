import { INCENTIVE_CATEGORIES } from "@/cms/tracker/collections";
import { stateData, type StateData } from "./data";

// Compare state hydrogen policies (751:7856, step 5.4): up to four states side by side. "Not specified" means the
// policy text doesn't cover it; counts come from the tracker and the tenders listing. Shared by the page and its CSV.

export const MAX_STATES = 4;

export interface CompareRow {
  label: string;
  values: string[];
}

const NOT = "Not specified";

export async function compareStates(values: string[]): Promise<{ states: StateData[]; rows: CompareRow[] }> {
  const states = await Promise.all(values.slice(0, MAX_STATES).map((v) => stateData(v)));
  const incentive = (s: StateData, category: string) =>
    s.policy?.incentives?.find((i) => i.category === category)?.summary ?? NOT;
  const rows: CompareRow[] = [
    {
      label: "Policy and year",
      values: states.map((s) => (s.policy ? `${s.policy.policy}, ${String(s.policy.year)}` : NOT)),
    },
    ...INCENTIVE_CATEGORIES.filter((c) => c !== "Other" && c !== "Equipment buyers").map((c) => ({
      label: c,
      values: states.map((s) => incentive(s, c)),
    })),
    {
      label: "Nodal agency",
      values: states.map((s) => s.policy?.nodalAgency?.short ?? s.policy?.nodalAgency?.name ?? NOT),
    },
    { label: "Projects in the tracker", values: states.map((s) => String(s.projectCount)) },
    { label: "Open tenders", values: states.map((s) => String(s.tenders.length)) },
  ];
  return { states, rows };
}

/** CSV with a header row; every cell quoted, quotes doubled. */
export function toCsv(states: StateData[], rows: CompareRow[]): string {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [["", ...states.map((s) => s.name)], ...rows.map((r) => [r.label, ...r.values])]
    .map((line) => line.map(cell).join(","))
    .join("\r\n");
}
