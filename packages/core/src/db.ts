import { parseServerEnv } from "@h2india/config";
import { createDb, type DbHandle } from "@h2india/db";

let handle: DbHandle | undefined;

/** The application's database connection, opened on first use. */
export function getDb(): DbHandle["db"] {
  handle ??= createDb(parseServerEnv().DATABASE_URL);
  return handle.db;
}
