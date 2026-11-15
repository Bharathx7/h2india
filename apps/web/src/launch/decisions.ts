// The launch check's reading of docs/decisions.md (step 13.4): an Open decision blocks a launch when its "Blocks"
// column names that launch or its gate (Launch 1 / Gate 2, Launch 2 / Gate 3), or its safe default says it must be
// answered before launch. Decisions that only block a step that is already built run on their safe default.

export interface Blocker {
  id: string;
  question: string;
  blocks: string;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

export function launchBlockers(markdown: string, launch: 1 | 2): Blocker[] {
  const out: Blocker[] = [];
  let columns: string[] | null = null;
  for (const line of markdown.split("\n")) {
    if (!line.trim().startsWith("|")) {
      columns = null;
      continue;
    }
    const row = cells(line);
    if (row[0] === "ID") {
      columns = row;
      continue;
    }
    if (!columns || /^-+$/.test(row[0] ?? "")) continue;
    const at = (name: string) => row[columns?.indexOf(name) ?? -1] ?? "";
    const status = at("Status");
    if (!/^Open\b/i.test(status)) continue;
    const blocks = at("Blocks");
    const fallback = at("Safe default until answered");
    const names = launch === 1 ? /Launch 1|Gate 2/i : /Launch [12]|Gate [23]/i;
    if (names.test(blocks) || /must answer before launch/i.test(fallback))
      out.push({ id: row[0] ?? "", question: at("Question") || at("What"), blocks });
  }
  return out;
}
