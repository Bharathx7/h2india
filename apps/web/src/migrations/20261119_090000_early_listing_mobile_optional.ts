import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Personal mobile numbers are hidden until an SMS provider is connected (founder, 19 Nov 2026): the Coming soon
// early-listing form's mobile becomes optional. Written by hand in the shape payload migrate:create makes.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "cms"."early_listings" ALTER COLUMN "mobile" DROP NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "cms"."early_listings" SET "mobile" = '' WHERE "mobile" IS NULL;
  ALTER TABLE "cms"."early_listings" ALTER COLUMN "mobile" SET NOT NULL;`)
}
