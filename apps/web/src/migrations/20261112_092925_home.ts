import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_early_listings_sells" AS ENUM('systems', 'components', 'equipment', 'services', 'materials');
  CREATE TYPE "cms"."enum_early_listings_status" AS ENUM('New', 'Contacted', 'Listed', 'Not a fit');
  CREATE TABLE "cms"."early_listings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"mobile" varchar NOT NULL,
  	"sells" "cms"."enum_early_listings_sells" NOT NULL,
  	"consent_text" varchar,
  	"status" "cms"."enum_early_listings_status" DEFAULT 'New',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."home_figures_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"as_of" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms"."home_figures_sight_production" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" numeric NOT NULL
  );
  
  CREATE TABLE "cms"."home_figures_sight_manufacturing" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" numeric NOT NULL
  );
  
  CREATE TABLE "cms"."home_figures" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sight_source" varchar,
  	"sight_as_of" timestamp(3) with time zone,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_home_figures_v_version_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"as_of" timestamp(3) with time zone NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_home_figures_v_version_sight_production" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" numeric NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_home_figures_v_version_sight_manufacturing" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" numeric NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_home_figures_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_sight_source" varchar,
  	"version_sight_as_of" timestamp(3) with time zone,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."prelaunch_allow_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "cms"."prelaunch" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"launch_line" varchar DEFAULT 'Launching early 2027 · built for India''s hydrogen economy' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_prelaunch_v_version_allow_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_prelaunch_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_launch_line" varchar DEFAULT 'Launching early 2027 · built for India''s hydrogen economy' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."articles" ADD COLUMN "sample" boolean;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_sample" boolean;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "early_listings_id" integer;
  ALTER TABLE "cms"."home_figures_figures" ADD CONSTRAINT "home_figures_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."home_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."home_figures_sight_production" ADD CONSTRAINT "home_figures_sight_production_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."home_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."home_figures_sight_manufacturing" ADD CONSTRAINT "home_figures_sight_manufacturing_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."home_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_home_figures_v_version_figures" ADD CONSTRAINT "_home_figures_v_version_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_home_figures_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_home_figures_v_version_sight_production" ADD CONSTRAINT "_home_figures_v_version_sight_production_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_home_figures_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_home_figures_v_version_sight_manufacturing" ADD CONSTRAINT "_home_figures_v_version_sight_manufacturing_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_home_figures_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."prelaunch_allow_list" ADD CONSTRAINT "prelaunch_allow_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."prelaunch"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_prelaunch_v_version_allow_list" ADD CONSTRAINT "_prelaunch_v_version_allow_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_prelaunch_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "early_listings_updated_at_idx" ON "cms"."early_listings" USING btree ("updated_at");
  CREATE INDEX "early_listings_created_at_idx" ON "cms"."early_listings" USING btree ("created_at");
  CREATE INDEX "home_figures_figures_order_idx" ON "cms"."home_figures_figures" USING btree ("_order");
  CREATE INDEX "home_figures_figures_parent_id_idx" ON "cms"."home_figures_figures" USING btree ("_parent_id");
  CREATE INDEX "home_figures_sight_production_order_idx" ON "cms"."home_figures_sight_production" USING btree ("_order");
  CREATE INDEX "home_figures_sight_production_parent_id_idx" ON "cms"."home_figures_sight_production" USING btree ("_parent_id");
  CREATE INDEX "home_figures_sight_manufacturing_order_idx" ON "cms"."home_figures_sight_manufacturing" USING btree ("_order");
  CREATE INDEX "home_figures_sight_manufacturing_parent_id_idx" ON "cms"."home_figures_sight_manufacturing" USING btree ("_parent_id");
  CREATE INDEX "_home_figures_v_version_figures_order_idx" ON "cms"."_home_figures_v_version_figures" USING btree ("_order");
  CREATE INDEX "_home_figures_v_version_figures_parent_id_idx" ON "cms"."_home_figures_v_version_figures" USING btree ("_parent_id");
  CREATE INDEX "_home_figures_v_version_sight_production_order_idx" ON "cms"."_home_figures_v_version_sight_production" USING btree ("_order");
  CREATE INDEX "_home_figures_v_version_sight_production_parent_id_idx" ON "cms"."_home_figures_v_version_sight_production" USING btree ("_parent_id");
  CREATE INDEX "_home_figures_v_version_sight_manufacturing_order_idx" ON "cms"."_home_figures_v_version_sight_manufacturing" USING btree ("_order");
  CREATE INDEX "_home_figures_v_version_sight_manufacturing_parent_id_idx" ON "cms"."_home_figures_v_version_sight_manufacturing" USING btree ("_parent_id");
  CREATE INDEX "_home_figures_v_created_at_idx" ON "cms"."_home_figures_v" USING btree ("created_at");
  CREATE INDEX "_home_figures_v_updated_at_idx" ON "cms"."_home_figures_v" USING btree ("updated_at");
  CREATE INDEX "prelaunch_allow_list_order_idx" ON "cms"."prelaunch_allow_list" USING btree ("_order");
  CREATE INDEX "prelaunch_allow_list_parent_id_idx" ON "cms"."prelaunch_allow_list" USING btree ("_parent_id");
  CREATE INDEX "_prelaunch_v_version_allow_list_order_idx" ON "cms"."_prelaunch_v_version_allow_list" USING btree ("_order");
  CREATE INDEX "_prelaunch_v_version_allow_list_parent_id_idx" ON "cms"."_prelaunch_v_version_allow_list" USING btree ("_parent_id");
  CREATE INDEX "_prelaunch_v_created_at_idx" ON "cms"."_prelaunch_v" USING btree ("created_at");
  CREATE INDEX "_prelaunch_v_updated_at_idx" ON "cms"."_prelaunch_v" USING btree ("updated_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_early_listings_fk" FOREIGN KEY ("early_listings_id") REFERENCES "cms"."early_listings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_early_listings_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("early_listings_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."early_listings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."home_figures_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."home_figures_sight_production" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."home_figures_sight_manufacturing" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."home_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_home_figures_v_version_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_home_figures_v_version_sight_production" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_home_figures_v_version_sight_manufacturing" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_home_figures_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."prelaunch_allow_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."prelaunch" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_prelaunch_v_version_allow_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_prelaunch_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."early_listings" CASCADE;
  DROP TABLE "cms"."home_figures_figures" CASCADE;
  DROP TABLE "cms"."home_figures_sight_production" CASCADE;
  DROP TABLE "cms"."home_figures_sight_manufacturing" CASCADE;
  DROP TABLE "cms"."home_figures" CASCADE;
  DROP TABLE "cms"."_home_figures_v_version_figures" CASCADE;
  DROP TABLE "cms"."_home_figures_v_version_sight_production" CASCADE;
  DROP TABLE "cms"."_home_figures_v_version_sight_manufacturing" CASCADE;
  DROP TABLE "cms"."_home_figures_v" CASCADE;
  DROP TABLE "cms"."prelaunch_allow_list" CASCADE;
  DROP TABLE "cms"."prelaunch" CASCADE;
  DROP TABLE "cms"."_prelaunch_v_version_allow_list" CASCADE;
  DROP TABLE "cms"."_prelaunch_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_early_listings_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_early_listings_id_idx";
  ALTER TABLE "cms"."articles" DROP COLUMN "sample";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_sample";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "early_listings_id";
  DROP TYPE "cms"."enum_early_listings_sells";
  DROP TYPE "cms"."enum_early_listings_status";`)
}
