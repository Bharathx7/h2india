import { writeFileSync } from "node:fs";
import { inventoryMarkdown } from "../src/compliance/inventory";

// Writes docs/privacy/inventory.md from the inventory in code (step 12.2): pnpm privacy:inventory
const path = new URL("../../../docs/privacy/inventory.md", import.meta.url);
writeFileSync(path, inventoryMarkdown());
console.log(`Wrote ${path.pathname}`);
