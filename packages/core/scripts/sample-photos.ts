import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../src/db";
import { attachSamplePhoto, removeSamplePhotos } from "../src/products/sample-photos";

// Photos for the sample products (founder, 20 Nov 2026):
//   pnpm samples:photos            attaches them
//   pnpm samples:photos --remove   takes them off again, so the sample products show the drawing
// On the server: docker compose -f compose.prod.yml --env-file h2india.env run --rm tools pnpm samples:photos
// Each file in scripts/sample-photos is named after a sample product's slug. Needs the database, file storage and the
// virus scanner (ClamAV). Only sample products without a photo change; running it again changes nothing.

const dir = join(dirname(fileURLToPath(import.meta.url)), "sample-photos");
const files = (await readdir(dir)).filter((n) => n.endsWith(".jpg")).sort();
const db = getDb();
let failed = false;
if (process.argv.includes("--remove")) {
  for (const name of files) {
    const slug = name.replace(/\.jpg$/, "");
    console.log(`${slug}: ${await removeSamplePhotos(db, slug)}`);
  }
  process.exit(0);
}
for (const name of files) {
  const slug = name.replace(/\.jpg$/, "");
  const result = await attachSamplePhoto(db, {
    slug,
    name,
    type: "image/jpeg",
    bytes: new Uint8Array(await readFile(join(dir, name))),
  });
  if (result.startsWith("rejected")) failed = true;
  console.log(`${slug}: ${result}`);
}
process.exit(failed ? 1 : 0);
