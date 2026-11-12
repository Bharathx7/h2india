import nextEnv from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The CMS command line (migrations, type and import-map generation) runs outside Next: read the repository's
// .env.local first, like next.config does. Imported first by payload.config.ts, so it runs before anything reads settings.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production", undefined, true);
