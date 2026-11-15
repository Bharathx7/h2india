import fs from "node:fs";
import path from "node:path";
import { routesDoc, scanRoutes, staleAllowList, unguarded } from "../apps/web/src/security/route-inventory";

// Writes docs/security/routes.md: every API route and server action with its guard (playbook step 12.1).
// Run: pnpm tsx scripts/route-inventory.ts

async function main() {
  const root = path.resolve(__dirname, "..");
  const entries = scanRoutes(path.join(root, "apps/web/src"));
  const out = path.join(root, "docs/security/routes.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, await routesDoc(entries, out));

  const missing = unguarded(entries);
  const stale = staleAllowList(entries);
  console.log(`Wrote ${path.relative(root, out)}: ${entries.length} entries.`);
  for (const e of missing) console.log(`No guard and not allow-listed: ${e.file}#${e.name}`);
  for (const k of stale) console.log(`Allow-list entry covers no unguarded entry: ${k}`);
  if (missing.length || stale.length) process.exitCode = 1;
}

void main();
