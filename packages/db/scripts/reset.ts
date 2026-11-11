import pg from "pg";
import { runMigrations } from "../src/migrate";

// Drops and rebuilds the local database. Refuses anything that is not on this machine.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const host = new URL(url).hostname;
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1"].includes(host)) {
  throw new Error(`db:reset only runs against a local database, not ${host}`);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("DROP SCHEMA IF EXISTS core CASCADE; DROP SCHEMA IF EXISTS cms CASCADE;");
await client.end();
await runMigrations(url);
console.log("local database reset and migrated");
