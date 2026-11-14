import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_articles_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_articles_level" AS ENUM('Beginner', 'Professional', 'Expert');
  CREATE TYPE "cms"."enum_articles_live_status" AS ENUM('off', 'live', 'ended');
  CREATE TYPE "cms"."enum__articles_v_version_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__articles_v_version_level" AS ENUM('Beginner', 'Professional', 'Expert');
  CREATE TYPE "cms"."enum__articles_v_version_live_status" AS ENUM('off', 'live', 'ended');
  CREATE TYPE "cms"."enum_guides_level" AS ENUM('Beginner', 'Professional', 'Expert');
  CREATE TYPE "cms"."enum__guides_v_version_level" AS ENUM('Beginner', 'Professional', 'Expert');
  CREATE TABLE "cms"."articles_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_articles_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."articles_key_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "cms"."articles_live_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "cms"."articles_live_key_numbers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "cms"."articles_live_updates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"title" varchar,
  	"text" varchar,
  	"document_title" varchar,
  	"document_url" varchar,
  	"document_note" varchar
  );
  
  CREATE TABLE "cms"."_articles_v_version_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__articles_v_version_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_articles_v_version_key_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_articles_v_version_live_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_articles_v_version_live_key_numbers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_articles_v_version_live_updates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"title" varchar,
  	"text" varchar,
  	"document_title" varchar,
  	"document_url" varchar,
  	"document_note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."guides_learn" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "cms"."_guides_v_version_learn" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "cms"."articles" ADD COLUMN "featured" boolean;
  ALTER TABLE "cms"."articles" ADD COLUMN "level" "cms"."enum_articles_level";
  ALTER TABLE "cms"."articles" ADD COLUMN "live_status" "cms"."enum_articles_live_status" DEFAULT 'off';
  ALTER TABLE "cms"."articles" ADD COLUMN "live_summary_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."articles" ADD COLUMN "live_key_numbers_source" varchar;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_featured" boolean;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_level" "cms"."enum__articles_v_version_level";
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_live_status" "cms"."enum__articles_v_version_live_status" DEFAULT 'off';
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_live_summary_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_live_key_numbers_source" varchar;
  ALTER TABLE "cms"."guides" ADD COLUMN "level" "cms"."enum_guides_level";
  ALTER TABLE "cms"."guides" ADD COLUMN "audience" varchar;
  ALTER TABLE "cms"."_guides_v" ADD COLUMN "version_level" "cms"."enum__guides_v_version_level";
  ALTER TABLE "cms"."_guides_v" ADD COLUMN "version_audience" varchar;
  ALTER TABLE "cms"."topics" ADD COLUMN "order" numeric;
  ALTER TABLE "cms"."articles_states" ADD CONSTRAINT "articles_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_key_facts" ADD CONSTRAINT "articles_key_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_live_summary" ADD CONSTRAINT "articles_live_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_live_key_numbers" ADD CONSTRAINT "articles_live_key_numbers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_live_updates" ADD CONSTRAINT "articles_live_updates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_states" ADD CONSTRAINT "_articles_v_version_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_key_facts" ADD CONSTRAINT "_articles_v_version_key_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_live_summary" ADD CONSTRAINT "_articles_v_version_live_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_live_key_numbers" ADD CONSTRAINT "_articles_v_version_live_key_numbers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_live_updates" ADD CONSTRAINT "_articles_v_version_live_updates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."guides_learn" ADD CONSTRAINT "guides_learn_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v_version_learn" ADD CONSTRAINT "_guides_v_version_learn_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_states_order_idx" ON "cms"."articles_states" USING btree ("order");
  CREATE INDEX "articles_states_parent_idx" ON "cms"."articles_states" USING btree ("parent_id");
  CREATE INDEX "articles_key_facts_order_idx" ON "cms"."articles_key_facts" USING btree ("_order");
  CREATE INDEX "articles_key_facts_parent_id_idx" ON "cms"."articles_key_facts" USING btree ("_parent_id");
  CREATE INDEX "articles_live_summary_order_idx" ON "cms"."articles_live_summary" USING btree ("_order");
  CREATE INDEX "articles_live_summary_parent_id_idx" ON "cms"."articles_live_summary" USING btree ("_parent_id");
  CREATE INDEX "articles_live_key_numbers_order_idx" ON "cms"."articles_live_key_numbers" USING btree ("_order");
  CREATE INDEX "articles_live_key_numbers_parent_id_idx" ON "cms"."articles_live_key_numbers" USING btree ("_parent_id");
  CREATE INDEX "articles_live_updates_order_idx" ON "cms"."articles_live_updates" USING btree ("_order");
  CREATE INDEX "articles_live_updates_parent_id_idx" ON "cms"."articles_live_updates" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_states_order_idx" ON "cms"."_articles_v_version_states" USING btree ("order");
  CREATE INDEX "_articles_v_version_states_parent_idx" ON "cms"."_articles_v_version_states" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_key_facts_order_idx" ON "cms"."_articles_v_version_key_facts" USING btree ("_order");
  CREATE INDEX "_articles_v_version_key_facts_parent_id_idx" ON "cms"."_articles_v_version_key_facts" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_live_summary_order_idx" ON "cms"."_articles_v_version_live_summary" USING btree ("_order");
  CREATE INDEX "_articles_v_version_live_summary_parent_id_idx" ON "cms"."_articles_v_version_live_summary" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_live_key_numbers_order_idx" ON "cms"."_articles_v_version_live_key_numbers" USING btree ("_order");
  CREATE INDEX "_articles_v_version_live_key_numbers_parent_id_idx" ON "cms"."_articles_v_version_live_key_numbers" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_live_updates_order_idx" ON "cms"."_articles_v_version_live_updates" USING btree ("_order");
  CREATE INDEX "_articles_v_version_live_updates_parent_id_idx" ON "cms"."_articles_v_version_live_updates" USING btree ("_parent_id");
  CREATE INDEX "guides_learn_order_idx" ON "cms"."guides_learn" USING btree ("_order");
  CREATE INDEX "guides_learn_parent_id_idx" ON "cms"."guides_learn" USING btree ("_parent_id");
  CREATE INDEX "_guides_v_version_learn_order_idx" ON "cms"."_guides_v_version_learn" USING btree ("_order");
  CREATE INDEX "_guides_v_version_learn_parent_id_idx" ON "cms"."_guides_v_version_learn" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."articles_states" CASCADE;
  DROP TABLE "cms"."articles_key_facts" CASCADE;
  DROP TABLE "cms"."articles_live_summary" CASCADE;
  DROP TABLE "cms"."articles_live_key_numbers" CASCADE;
  DROP TABLE "cms"."articles_live_updates" CASCADE;
  DROP TABLE "cms"."_articles_v_version_states" CASCADE;
  DROP TABLE "cms"."_articles_v_version_key_facts" CASCADE;
  DROP TABLE "cms"."_articles_v_version_live_summary" CASCADE;
  DROP TABLE "cms"."_articles_v_version_live_key_numbers" CASCADE;
  DROP TABLE "cms"."_articles_v_version_live_updates" CASCADE;
  DROP TABLE "cms"."guides_learn" CASCADE;
  DROP TABLE "cms"."_guides_v_version_learn" CASCADE;
  ALTER TABLE "cms"."articles" DROP COLUMN "featured";
  ALTER TABLE "cms"."articles" DROP COLUMN "level";
  ALTER TABLE "cms"."articles" DROP COLUMN "live_status";
  ALTER TABLE "cms"."articles" DROP COLUMN "live_summary_at";
  ALTER TABLE "cms"."articles" DROP COLUMN "live_key_numbers_source";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_featured";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_level";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_live_status";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_live_summary_at";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_live_key_numbers_source";
  ALTER TABLE "cms"."guides" DROP COLUMN "level";
  ALTER TABLE "cms"."guides" DROP COLUMN "audience";
  ALTER TABLE "cms"."_guides_v" DROP COLUMN "version_level";
  ALTER TABLE "cms"."_guides_v" DROP COLUMN "version_audience";
  ALTER TABLE "cms"."topics" DROP COLUMN "order";
  DROP TYPE "cms"."enum_articles_states";
  DROP TYPE "cms"."enum_articles_level";
  DROP TYPE "cms"."enum_articles_live_status";
  DROP TYPE "cms"."enum__articles_v_version_states";
  DROP TYPE "cms"."enum__articles_v_version_level";
  DROP TYPE "cms"."enum__articles_v_version_live_status";
  DROP TYPE "cms"."enum_guides_level";
  DROP TYPE "cms"."enum__guides_v_version_level";`)
}
