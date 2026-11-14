// pnpm search:reindex [index…] (step 5.2): rebuilds search indexes from the database, which is the truth. With no
// names it rebuilds every index. Readers keep searching the old copy until the new one is swapped in.
// Example: pnpm search:reindex articles companies
import config from "../src/payload.config";
import { replaceIndex, SEARCH_INDEX_UIDS, isSearchIndex } from "@h2india/core/search";
import { getPayload } from "payload";
import { allDocuments } from "../src/search/documents";

const asked = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const unknown = asked.filter((a) => !isSearchIndex(a));
if (unknown.length) {
  console.error(`Unknown index: ${unknown.join(", ")}. Indexes: ${SEARCH_INDEX_UIDS.join(", ")}`);
  process.exit(1);
}
const targets = asked.length ? asked.filter(isSearchIndex) : [...SEARCH_INDEX_UIDS];

let code = 0;
try {
  const payload = await getPayload({ config });
  for (const uid of targets) {
    const docs = await allDocuments(payload, uid);
    await replaceIndex(uid, docs);
    console.log(`search:reindex ${uid}: ${String(docs.length)} documents`);
  }
} catch (error) {
  console.error(error);
  code = 1;
}
process.exit(code);
