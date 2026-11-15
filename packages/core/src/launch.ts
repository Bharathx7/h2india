import type { Executor } from "@h2india/db";
import { sql } from "drizzle-orm";

// The launch check's core half (step 13.4): sample rows still in the core tables. Every table with a `sample` column
// is counted, so a new one is checked without a change here; soft-deleted rows don't count.
export async function coreSampleCounts(ex: Executor): Promise<{ table: string; rows: number }[]> {
  const tables = await ex.execute<{ table_name: string; soft: boolean }>(sql`
    select c.table_name,
      exists (select 1 from information_schema.columns d
        where d.table_schema = 'core' and d.table_name = c.table_name and d.column_name = 'deleted_at') as soft
    from information_schema.columns c
    where c.table_schema = 'core' and c.column_name = 'sample'
    order by c.table_name`);
  const out: { table: string; rows: number }[] = [];
  for (const t of tables.rows) {
    // Names come from the catalogue above, never from input.
    const name = sql.raw(`core."${t.table_name.replace(/"/g, "")}"`);
    const r = await ex.execute<{ n: number }>(
      t.soft
        ? sql`select count(*)::int as n from ${name} where sample and deleted_at is null`
        : sql`select count(*)::int as n from ${name} where sample`,
    );
    const rows = r.rows[0]?.n ?? 0;
    if (rows) out.push({ table: `core.${t.table_name}`, rows });
  }
  return out;
}
