import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."reports" ADD COLUMN "published_on" timestamp(3) with time zone;
  ALTER TABLE "cms"."_reports_v" ADD COLUMN "version_published_on" timestamp(3) with time zone;
  CREATE INDEX "reports_published_on_idx" ON "cms"."reports" USING btree ("published_on");
  CREATE INDEX "_reports_v_version_version_published_on_idx" ON "cms"."_reports_v" USING btree ("version_published_on");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms"."reports_published_on_idx";
  DROP INDEX "cms"."_reports_v_version_version_published_on_idx";
  ALTER TABLE "cms"."reports" DROP COLUMN "published_on";
  ALTER TABLE "cms"."_reports_v" DROP COLUMN "version_published_on";`)
}
