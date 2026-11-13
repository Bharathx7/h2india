import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * A product's company isn't suspended (step 11.4): suspended companies' listings leave the marketplace, product pages,
 * compare and search. Add to every public read of live products.
 */
export const supplierNotSuspended = (organisationId: PgColumn): SQL =>
  sql`not exists (select 1 from core.organisations so where so.id = ${organisationId} and so.suspended_at is not null)`;
