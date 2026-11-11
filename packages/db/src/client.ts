import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** A transaction or the database itself; data functions accept either. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
}

/** Opens a pool. Times are read and written as UTC. */
export function createDb(url: string, options: { max?: number } = {}): DbHandle {
  const pool = new pg.Pool({ connectionString: url, max: options.max ?? 10, application_name: "h2india" });
  pool.on("connect", (client) => {
    void client.query("SET TIME ZONE 'UTC'");
  });
  return { db: drizzle(pool, { schema, casing: "snake_case" }), pool };
}

export { schema };
