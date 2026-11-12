#!/usr/bin/env node
// pnpm import:<type> <file> [--apply] (step 4.6, A41). Checks by default and changes nothing; --apply writes when no
// row has a problem. Runs the importer inside the web app, where the CMS lives.
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const [type, file] = args.filter((a) => !a.startsWith("--"));
if (!type || !file) {
  console.error("Usage: pnpm import:<type> <file.csv|file.json> [--apply]");
  process.exit(2);
}
const from = process.env.INIT_CWD ?? process.cwd();
const abs = path.resolve(from, file);
const result = spawnSync(
  "pnpm",
  ["--filter", "@h2india/web", "exec", "payload", "run", "scripts/import.ts", type, abs, ...(apply ? ["apply"] : [])],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
