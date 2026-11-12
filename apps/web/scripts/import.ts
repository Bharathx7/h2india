// pnpm import:<type> <file> [--apply] (step 4.6): run through scripts/content-import.mjs at the repo root, which calls
// `payload run scripts/import.ts <type> <file> [apply]` here. Checks by default (A41); "apply" writes.
import config from "../src/payload.config";
import { importCompanies } from "@h2india/core/companies";
import { formatReport, parseImportFile } from "@h2india/core/importing";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";
import { importContent } from "../src/cms/import/run";
import { IMPORT_TYPE_NAMES, type ContentTypeName } from "../src/cms/import/types";

const [type, file, mode] = process.argv.slice(2);

async function main(): Promise<number> {
  if (!type || !file || !(IMPORT_TYPE_NAMES as readonly string[]).includes(type)) {
    console.error(`Usage: pnpm import:<type> <file.csv|file.json> [--apply]\nTypes: ${IMPORT_TYPE_NAMES.join(", ")}`);
    return 2;
  }
  const apply = mode === "apply";
  const name = path.resolve(file);
  let rows: Record<string, unknown>[];
  try {
    rows = parseImportFile(name, await readFile(name, "utf8"));
  } catch (error) {
    console.error(`Can't read ${name}: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const firstRow = name.toLowerCase().endsWith(".json") ? 1 : 2;
  const payload = await getPayload({ config });
  const report =
    type === "companies"
      ? await importCompanies(rows, { apply, firstRow })
      : await importContent(payload, type as ContentTypeName, rows, { apply, firstRow });
  console.log(formatReport(report));
  return report.counts.error > 0 ? 1 : 0;
}

// `payload run` exits once the module has loaded, so the work is awaited at the top level.
let code = 1;
try {
  code = await main();
} catch (error) {
  console.error(error);
}
process.exit(code);
