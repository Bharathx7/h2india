import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_newsletter_issues_sections_heading" AS ENUM('This week in Indian hydrogen', 'Opportunities closing this week', 'Number of the week', 'Explainer of the week', 'New on the marketplace', 'People and jobs', 'Events this month', 'Global to India');
  CREATE TYPE "cms"."enum_newsletter_issues_list" AS ENUM('weekly', 'tender-digest');
  CREATE TYPE "cms"."enum_newsletter_issues_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__newsletter_issues_v_version_sections_heading" AS ENUM('This week in Indian hydrogen', 'Opportunities closing this week', 'Number of the week', 'Explainer of the week', 'New on the marketplace', 'People and jobs', 'Events this month', 'Global to India');
  CREATE TYPE "cms"."enum__newsletter_issues_v_version_list" AS ENUM('weekly', 'tender-digest');
  CREATE TYPE "cms"."enum__newsletter_issues_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."newsletter_issues_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."newsletter_issues_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" "cms"."enum_newsletter_issues_sections_heading",
  	"body" jsonb
  );
  
  CREATE TABLE "cms"."newsletter_issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list" "cms"."enum_newsletter_issues_list" DEFAULT 'weekly',
  	"number" numeric,
  	"sent_on" timestamp(3) with time zone,
  	"read_minutes" numeric DEFAULT 6,
  	"title" varchar,
  	"slug" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_newsletter_issues_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_newsletter_issues_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_newsletter_issues_v_version_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" "cms"."enum__newsletter_issues_v_version_sections_heading",
  	"body" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_newsletter_issues_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_list" "cms"."enum__newsletter_issues_v_version_list" DEFAULT 'weekly',
  	"version_number" numeric,
  	"version_sent_on" timestamp(3) with time zone,
  	"version_read_minutes" numeric DEFAULT 6,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__newsletter_issues_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "newsletter_issues_id" integer;
  ALTER TABLE "cms"."newsletter_issues_highlights" ADD CONSTRAINT "newsletter_issues_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."newsletter_issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."newsletter_issues_sections" ADD CONSTRAINT "newsletter_issues_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."newsletter_issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_newsletter_issues_v_version_highlights" ADD CONSTRAINT "_newsletter_issues_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_newsletter_issues_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_newsletter_issues_v_version_sections" ADD CONSTRAINT "_newsletter_issues_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_newsletter_issues_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_newsletter_issues_v" ADD CONSTRAINT "_newsletter_issues_v_parent_id_newsletter_issues_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."newsletter_issues"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "newsletter_issues_highlights_order_idx" ON "cms"."newsletter_issues_highlights" USING btree ("_order");
  CREATE INDEX "newsletter_issues_highlights_parent_id_idx" ON "cms"."newsletter_issues_highlights" USING btree ("_parent_id");
  CREATE INDEX "newsletter_issues_sections_order_idx" ON "cms"."newsletter_issues_sections" USING btree ("_order");
  CREATE INDEX "newsletter_issues_sections_parent_id_idx" ON "cms"."newsletter_issues_sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "newsletter_issues_slug_idx" ON "cms"."newsletter_issues" USING btree ("slug");
  CREATE INDEX "newsletter_issues_updated_at_idx" ON "cms"."newsletter_issues" USING btree ("updated_at");
  CREATE INDEX "newsletter_issues_created_at_idx" ON "cms"."newsletter_issues" USING btree ("created_at");
  CREATE INDEX "newsletter_issues__status_idx" ON "cms"."newsletter_issues" USING btree ("_status");
  CREATE INDEX "_newsletter_issues_v_version_highlights_order_idx" ON "cms"."_newsletter_issues_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_newsletter_issues_v_version_highlights_parent_id_idx" ON "cms"."_newsletter_issues_v_version_highlights" USING btree ("_parent_id");
  CREATE INDEX "_newsletter_issues_v_version_sections_order_idx" ON "cms"."_newsletter_issues_v_version_sections" USING btree ("_order");
  CREATE INDEX "_newsletter_issues_v_version_sections_parent_id_idx" ON "cms"."_newsletter_issues_v_version_sections" USING btree ("_parent_id");
  CREATE INDEX "_newsletter_issues_v_parent_idx" ON "cms"."_newsletter_issues_v" USING btree ("parent_id");
  CREATE INDEX "_newsletter_issues_v_version_version_slug_idx" ON "cms"."_newsletter_issues_v" USING btree ("version_slug");
  CREATE INDEX "_newsletter_issues_v_version_version_updated_at_idx" ON "cms"."_newsletter_issues_v" USING btree ("version_updated_at");
  CREATE INDEX "_newsletter_issues_v_version_version_created_at_idx" ON "cms"."_newsletter_issues_v" USING btree ("version_created_at");
  CREATE INDEX "_newsletter_issues_v_version_version__status_idx" ON "cms"."_newsletter_issues_v" USING btree ("version__status");
  CREATE INDEX "_newsletter_issues_v_created_at_idx" ON "cms"."_newsletter_issues_v" USING btree ("created_at");
  CREATE INDEX "_newsletter_issues_v_updated_at_idx" ON "cms"."_newsletter_issues_v" USING btree ("updated_at");
  CREATE INDEX "_newsletter_issues_v_latest_idx" ON "cms"."_newsletter_issues_v" USING btree ("latest");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_issues_fk" FOREIGN KEY ("newsletter_issues_id") REFERENCES "cms"."newsletter_issues"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_newsletter_issues_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("newsletter_issues_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."newsletter_issues_highlights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."newsletter_issues_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."newsletter_issues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_newsletter_issues_v_version_highlights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_newsletter_issues_v_version_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_newsletter_issues_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."newsletter_issues_highlights" CASCADE;
  DROP TABLE "cms"."newsletter_issues_sections" CASCADE;
  DROP TABLE "cms"."newsletter_issues" CASCADE;
  DROP TABLE "cms"."_newsletter_issues_v_version_highlights" CASCADE;
  DROP TABLE "cms"."_newsletter_issues_v_version_sections" CASCADE;
  DROP TABLE "cms"."_newsletter_issues_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletter_issues_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_newsletter_issues_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "newsletter_issues_id";
  DROP TYPE "cms"."enum_newsletter_issues_sections_heading";
  DROP TYPE "cms"."enum_newsletter_issues_list";
  DROP TYPE "cms"."enum_newsletter_issues_status";
  DROP TYPE "cms"."enum__newsletter_issues_v_version_sections_heading";
  DROP TYPE "cms"."enum__newsletter_issues_v_version_list";
  DROP TYPE "cms"."enum__newsletter_issues_v_version_status";`)
}
