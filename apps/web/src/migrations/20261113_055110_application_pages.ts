import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_application_pages_application" AS ENUM('production', 'storage-transport', 'refuelling-mobility', 'fuel-cells-power', 'industrial-use', 'ports-shipping', 'safety-testing');
  CREATE TYPE "cms"."enum_application_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__application_pages_v_version_application" AS ENUM('production', 'storage-transport', 'refuelling-mobility', 'fuel-cells-power', 'industrial-use', 'ports-shipping', 'safety-testing');
  CREATE TYPE "cms"."enum__application_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."application_pages_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "cms"."application_pages_chain_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"category" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "cms"."application_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"application" "cms"."enum_application_pages_application",
  	"title" varchar,
  	"intro" varchar,
  	"figures_source" varchar,
  	"figures_as_of" timestamp(3) with time zone,
  	"chain_title" varchar,
  	"chain_note" varchar,
  	"guide_id" integer,
  	"cta_title" varchar,
  	"cta_text" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_application_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."application_pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_application_pages_v_version_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_application_pages_v_version_chain_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"category" varchar,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_application_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_application" "cms"."enum__application_pages_v_version_application",
  	"version_title" varchar,
  	"version_intro" varchar,
  	"version_figures_source" varchar,
  	"version_figures_as_of" timestamp(3) with time zone,
  	"version_chain_title" varchar,
  	"version_chain_note" varchar,
  	"version_guide_id" integer,
  	"version_cta_title" varchar,
  	"version_cta_text" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__application_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_application_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "application_pages_id" integer;
  ALTER TABLE "cms"."application_pages_figures" ADD CONSTRAINT "application_pages_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."application_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."application_pages_chain_steps" ADD CONSTRAINT "application_pages_chain_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."application_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."application_pages" ADD CONSTRAINT "application_pages_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "cms"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."application_pages_rels" ADD CONSTRAINT "application_pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."application_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."application_pages_rels" ADD CONSTRAINT "application_pages_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_application_pages_v_version_figures" ADD CONSTRAINT "_application_pages_v_version_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_application_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_application_pages_v_version_chain_steps" ADD CONSTRAINT "_application_pages_v_version_chain_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_application_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_application_pages_v" ADD CONSTRAINT "_application_pages_v_parent_id_application_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."application_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_application_pages_v" ADD CONSTRAINT "_application_pages_v_version_guide_id_guides_id_fk" FOREIGN KEY ("version_guide_id") REFERENCES "cms"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_application_pages_v_rels" ADD CONSTRAINT "_application_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_application_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_application_pages_v_rels" ADD CONSTRAINT "_application_pages_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "application_pages_figures_order_idx" ON "cms"."application_pages_figures" USING btree ("_order");
  CREATE INDEX "application_pages_figures_parent_id_idx" ON "cms"."application_pages_figures" USING btree ("_parent_id");
  CREATE INDEX "application_pages_chain_steps_order_idx" ON "cms"."application_pages_chain_steps" USING btree ("_order");
  CREATE INDEX "application_pages_chain_steps_parent_id_idx" ON "cms"."application_pages_chain_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "application_pages_application_idx" ON "cms"."application_pages" USING btree ("application");
  CREATE INDEX "application_pages_guide_idx" ON "cms"."application_pages" USING btree ("guide_id");
  CREATE INDEX "application_pages_updated_at_idx" ON "cms"."application_pages" USING btree ("updated_at");
  CREATE INDEX "application_pages_created_at_idx" ON "cms"."application_pages" USING btree ("created_at");
  CREATE INDEX "application_pages__status_idx" ON "cms"."application_pages" USING btree ("_status");
  CREATE INDEX "application_pages_rels_order_idx" ON "cms"."application_pages_rels" USING btree ("order");
  CREATE INDEX "application_pages_rels_parent_idx" ON "cms"."application_pages_rels" USING btree ("parent_id");
  CREATE INDEX "application_pages_rels_path_idx" ON "cms"."application_pages_rels" USING btree ("path");
  CREATE INDEX "application_pages_rels_topics_id_idx" ON "cms"."application_pages_rels" USING btree ("topics_id");
  CREATE INDEX "_application_pages_v_version_figures_order_idx" ON "cms"."_application_pages_v_version_figures" USING btree ("_order");
  CREATE INDEX "_application_pages_v_version_figures_parent_id_idx" ON "cms"."_application_pages_v_version_figures" USING btree ("_parent_id");
  CREATE INDEX "_application_pages_v_version_chain_steps_order_idx" ON "cms"."_application_pages_v_version_chain_steps" USING btree ("_order");
  CREATE INDEX "_application_pages_v_version_chain_steps_parent_id_idx" ON "cms"."_application_pages_v_version_chain_steps" USING btree ("_parent_id");
  CREATE INDEX "_application_pages_v_parent_idx" ON "cms"."_application_pages_v" USING btree ("parent_id");
  CREATE INDEX "_application_pages_v_version_version_application_idx" ON "cms"."_application_pages_v" USING btree ("version_application");
  CREATE INDEX "_application_pages_v_version_version_guide_idx" ON "cms"."_application_pages_v" USING btree ("version_guide_id");
  CREATE INDEX "_application_pages_v_version_version_updated_at_idx" ON "cms"."_application_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_application_pages_v_version_version_created_at_idx" ON "cms"."_application_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_application_pages_v_version_version__status_idx" ON "cms"."_application_pages_v" USING btree ("version__status");
  CREATE INDEX "_application_pages_v_created_at_idx" ON "cms"."_application_pages_v" USING btree ("created_at");
  CREATE INDEX "_application_pages_v_updated_at_idx" ON "cms"."_application_pages_v" USING btree ("updated_at");
  CREATE INDEX "_application_pages_v_latest_idx" ON "cms"."_application_pages_v" USING btree ("latest");
  CREATE INDEX "_application_pages_v_rels_order_idx" ON "cms"."_application_pages_v_rels" USING btree ("order");
  CREATE INDEX "_application_pages_v_rels_parent_idx" ON "cms"."_application_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_application_pages_v_rels_path_idx" ON "cms"."_application_pages_v_rels" USING btree ("path");
  CREATE INDEX "_application_pages_v_rels_topics_id_idx" ON "cms"."_application_pages_v_rels" USING btree ("topics_id");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_application_pages_fk" FOREIGN KEY ("application_pages_id") REFERENCES "cms"."application_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_application_pages_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("application_pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."application_pages_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."application_pages_chain_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."application_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."application_pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_application_pages_v_version_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_application_pages_v_version_chain_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_application_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_application_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."application_pages_figures" CASCADE;
  DROP TABLE "cms"."application_pages_chain_steps" CASCADE;
  DROP TABLE "cms"."application_pages" CASCADE;
  DROP TABLE "cms"."application_pages_rels" CASCADE;
  DROP TABLE "cms"."_application_pages_v_version_figures" CASCADE;
  DROP TABLE "cms"."_application_pages_v_version_chain_steps" CASCADE;
  DROP TABLE "cms"."_application_pages_v" CASCADE;
  DROP TABLE "cms"."_application_pages_v_rels" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_application_pages_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_application_pages_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "application_pages_id";
  DROP TYPE "cms"."enum_application_pages_application";
  DROP TYPE "cms"."enum_application_pages_status";
  DROP TYPE "cms"."enum__application_pages_v_version_application";
  DROP TYPE "cms"."enum__application_pages_v_version_status";`)
}
