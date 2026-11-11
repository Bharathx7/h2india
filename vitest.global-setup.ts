import pg from "pg";
import { runMigrations } from "./packages/db/src/migrate";

// Integration tests (*.int.test.ts) run against a real PostgreSQL named by TEST_DATABASE_URL.
// The database is created if missing and rebuilt from the migrations on every run. Without the
// variable the integration tests are skipped (CI always sets it).
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const target = new URL(url);
  const name = target.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(name)) throw new Error(`TEST_DATABASE_URL must name a *_test database, not "${name}"`);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
  await client.end();
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("DROP SCHEMA IF EXISTS core CASCADE; DROP SCHEMA IF EXISTS cms CASCADE;");
  await db.end();
  await runMigrations(url);
}
