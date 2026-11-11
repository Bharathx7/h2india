#!/usr/bin/env node
// Fails when a migration would destroy data without an explicit, reviewed marker (playbook step 3.1).
// Migrations are forward-only SQL. A destructive statement needs a comment on the line before it:
//   -- destructive-ok: <why this is safe, who approved it>

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "packages/db/migrations";
// Statements are matched where they start, so a trigger "BEFORE TRUNCATE ON ..." is not mistaken for one.
const DESTRUCTIVE = [
  /^\s*DROP\s+(TABLE|SCHEMA|TYPE|INDEX|VIEW|FUNCTION|TRIGGER)\b/i,
  /^\s*ALTER\s+TABLE\b[^;]*\bDROP\b/i,
  /\bALTER\s+COLUMN\b[^;]*\b(SET\s+DATA\s+)?TYPE\b/i,
  /^\s*TRUNCATE\b/i,
  /^\s*DELETE\s+FROM\b/i,
  /\bRENAME\s+(COLUMN|TO)\b/i,
];

const problems = [];
for (const file of readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  const lines = readFileSync(join(DIR, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.trim().startsWith("--")) return;
    if (DESTRUCTIVE.some((re) => re.test(line))) {
      const marked = lines.slice(Math.max(0, i - 3), i).some((l) => /--\s*destructive-ok:\s*\S/.test(l));
      if (!marked) problems.push(`${file}:${String(i + 1)}  ${line.trim()}`);
    }
  });
}
if (problems.length) {
  console.error(
    `Destructive migration statements need a "-- destructive-ok: <reason>" comment:\n${problems.join("\n")}`,
  );
  process.exit(1);
}
console.log("migrations: no unmarked destructive statements");
