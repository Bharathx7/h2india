import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client";

export const MIGRATIONS_FOLDER = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Applies pending migrations, forward only. Safe to run on every deploy. */
export async function runMigrations(url: string): Promise<void> {
  const { db, pool } = createDb(url, { max: 1 });
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER, migrationsSchema: "core", migrationsTable: "migrations" });
  } finally {
    await pool.end();
  }
}
