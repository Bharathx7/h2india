import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms"."articles_live_meaning" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "cms"."_articles_v_version_live_meaning" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "cms"."articles" ADD COLUMN "why_it_matters" varchar;
  ALTER TABLE "cms"."articles" ADD COLUMN "sponsor_about" varchar;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_why_it_matters" varchar;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_sponsor_about" varchar;
  ALTER TABLE "cms"."articles_live_meaning" ADD CONSTRAINT "articles_live_meaning_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_live_meaning" ADD CONSTRAINT "_articles_v_version_live_meaning_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_live_meaning_order_idx" ON "cms"."articles_live_meaning" USING btree ("_order");
  CREATE INDEX "articles_live_meaning_parent_id_idx" ON "cms"."articles_live_meaning" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_live_meaning_order_idx" ON "cms"."_articles_v_version_live_meaning" USING btree ("_order");
  CREATE INDEX "_articles_v_version_live_meaning_parent_id_idx" ON "cms"."_articles_v_version_live_meaning" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."articles_live_meaning" CASCADE;
  DROP TABLE "cms"."_articles_v_version_live_meaning" CASCADE;
  ALTER TABLE "cms"."articles" DROP COLUMN "why_it_matters";
  ALTER TABLE "cms"."articles" DROP COLUMN "sponsor_about";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_why_it_matters";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_sponsor_about";`)
}
