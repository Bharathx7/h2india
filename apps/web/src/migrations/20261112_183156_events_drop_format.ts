import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."events" DROP COLUMN "format";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_format";
  DROP TYPE "cms"."enum_events_format";
  DROP TYPE "cms"."enum__events_v_version_format";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_events_format" AS ENUM('Conference · in person', 'Workshop · in person', 'Expo · in person', 'Webinar · online', 'Hybrid');
  CREATE TYPE "cms"."enum__events_v_version_format" AS ENUM('Conference · in person', 'Workshop · in person', 'Expo · in person', 'Webinar · online', 'Hybrid');
  ALTER TABLE "cms"."events" ADD COLUMN "format" "cms"."enum_events_format";
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_format" "cms"."enum__events_v_version_format";`)
}
