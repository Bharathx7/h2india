import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_glossary_category" AS ENUM('Technology', 'Economics', 'Policy', 'Safety', 'Markets', 'Units');
  CREATE TYPE "cms"."enum__glossary_v_version_category" AS ENUM('Technology', 'Economics', 'Policy', 'Safety', 'Markets', 'Units');
  CREATE TYPE "cms"."enum_videos_kind" AS ENUM('Explainer', '60-second explainer', 'Interview', 'Event highlight');
  CREATE TYPE "cms"."enum__videos_v_version_kind" AS ENUM('Explainer', '60-second explainer', 'Interview', 'Event highlight');
  CREATE TABLE "cms"."chapters_quiz_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option" varchar
  );
  
  CREATE TABLE "cms"."chapters_quiz" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" numeric,
  	"explanation" varchar
  );
  
  CREATE TABLE "cms"."_chapters_v_version_quiz_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"option" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_chapters_v_version_quiz" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" numeric,
  	"explanation" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."standards_scope" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "cms"."_standards_v_version_scope" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."videos_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "cms"."videos_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "cms"."_videos_v_version_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_videos_v_version_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" varchar,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."podcasts_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "cms"."podcasts_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "cms"."_podcasts_v_version_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_podcasts_v_version_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" varchar,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."tracker_overview_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"source_url" varchar,
  	"as_of" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_overview" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"data_as_of" timestamp(3) with time zone,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_tracker_overview_v_version_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"source_url" varchar,
  	"as_of" timestamp(3) with time zone NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_overview_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_data_as_of" timestamp(3) with time zone,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DEFAULT 'Standard'::text;
  DROP TYPE "cms"."enum_standards_kind";
  CREATE TYPE "cms"."enum_standards_kind" AS ENUM('Standard', 'Rule', 'Notification', 'Guideline', 'Regulation');
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DEFAULT 'Standard'::"cms"."enum_standards_kind";
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DATA TYPE "cms"."enum_standards_kind" USING "kind"::"cms"."enum_standards_kind";
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DATA TYPE text;
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DEFAULT 'Standard'::text;
  DROP TYPE "cms"."enum__standards_v_version_kind";
  CREATE TYPE "cms"."enum__standards_v_version_kind" AS ENUM('Standard', 'Rule', 'Notification', 'Guideline', 'Regulation');
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DEFAULT 'Standard'::"cms"."enum__standards_v_version_kind";
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DATA TYPE "cms"."enum__standards_v_version_kind" USING "version_kind"::"cms"."enum__standards_v_version_kind";
  ALTER TABLE "cms"."chapters" ADD COLUMN "hero_caption" varchar;
  ALTER TABLE "cms"."chapters_rels" ADD COLUMN "glossary_id" integer;
  ALTER TABLE "cms"."_chapters_v" ADD COLUMN "version_hero_caption" varchar;
  ALTER TABLE "cms"."_chapters_v_rels" ADD COLUMN "glossary_id" integer;
  ALTER TABLE "cms"."glossary" ADD COLUMN "category" "cms"."enum_glossary_category";
  ALTER TABLE "cms"."glossary" ADD COLUMN "formula" varchar;
  ALTER TABLE "cms"."glossary" ADD COLUMN "formula_note" varchar;
  ALTER TABLE "cms"."glossary" ADD COLUMN "popular" boolean;
  ALTER TABLE "cms"."_glossary_v" ADD COLUMN "version_category" "cms"."enum__glossary_v_version_category";
  ALTER TABLE "cms"."_glossary_v" ADD COLUMN "version_formula" varchar;
  ALTER TABLE "cms"."_glossary_v" ADD COLUMN "version_formula_note" varchar;
  ALTER TABLE "cms"."_glossary_v" ADD COLUMN "version_popular" boolean;
  ALTER TABLE "cms"."standards" ADD COLUMN "dated" timestamp(3) with time zone;
  ALTER TABLE "cms"."standards" ADD COLUMN "document_type" varchar;
  ALTER TABLE "cms"."standards" ADD COLUMN "checked_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."standards_rels" ADD COLUMN "standards_id" integer;
  ALTER TABLE "cms"."_standards_v" ADD COLUMN "version_dated" timestamp(3) with time zone;
  ALTER TABLE "cms"."_standards_v" ADD COLUMN "version_document_type" varchar;
  ALTER TABLE "cms"."_standards_v" ADD COLUMN "version_checked_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_standards_v_rels" ADD COLUMN "standards_id" integer;
  ALTER TABLE "cms"."report_leads" ADD COLUMN "consent_version" varchar;
  ALTER TABLE "cms"."videos" ADD COLUMN "kind" "cms"."enum_videos_kind" DEFAULT 'Explainer';
  ALTER TABLE "cms"."videos" ADD COLUMN "featured" boolean;
  ALTER TABLE "cms"."videos" ADD COLUMN "language" varchar;
  ALTER TABLE "cms"."videos" ADD COLUMN "published_on" timestamp(3) with time zone;
  ALTER TABLE "cms"."_videos_v" ADD COLUMN "version_kind" "cms"."enum__videos_v_version_kind" DEFAULT 'Explainer';
  ALTER TABLE "cms"."_videos_v" ADD COLUMN "version_featured" boolean;
  ALTER TABLE "cms"."_videos_v" ADD COLUMN "version_language" varchar;
  ALTER TABLE "cms"."_videos_v" ADD COLUMN "version_published_on" timestamp(3) with time zone;
  ALTER TABLE "cms"."podcasts" ADD COLUMN "also_on" varchar;
  ALTER TABLE "cms"."podcasts" ADD COLUMN "published_on" timestamp(3) with time zone;
  ALTER TABLE "cms"."_podcasts_v" ADD COLUMN "version_also_on" varchar;
  ALTER TABLE "cms"."_podcasts_v" ADD COLUMN "version_published_on" timestamp(3) with time zone;
  ALTER TABLE "cms"."chapters_quiz_options" ADD CONSTRAINT "chapters_quiz_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."chapters_quiz"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."chapters_quiz" ADD CONSTRAINT "chapters_quiz_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v_version_quiz_options" ADD CONSTRAINT "_chapters_v_version_quiz_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_chapters_v_version_quiz"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v_version_quiz" ADD CONSTRAINT "_chapters_v_version_quiz_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_chapters_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."standards_scope" ADD CONSTRAINT "standards_scope_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_standards_v_version_scope" ADD CONSTRAINT "_standards_v_version_scope_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_standards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."videos_people" ADD CONSTRAINT "videos_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."videos_chapters" ADD CONSTRAINT "videos_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_videos_v_version_people" ADD CONSTRAINT "_videos_v_version_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_videos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_videos_v_version_chapters" ADD CONSTRAINT "_videos_v_version_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_videos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."podcasts_people" ADD CONSTRAINT "podcasts_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."podcasts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."podcasts_chapters" ADD CONSTRAINT "podcasts_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."podcasts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_podcasts_v_version_people" ADD CONSTRAINT "_podcasts_v_version_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_podcasts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_podcasts_v_version_chapters" ADD CONSTRAINT "_podcasts_v_version_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_podcasts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_overview_figures" ADD CONSTRAINT "tracker_overview_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_overview_v_version_figures" ADD CONSTRAINT "_tracker_overview_v_version_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_overview_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "chapters_quiz_options_order_idx" ON "cms"."chapters_quiz_options" USING btree ("_order");
  CREATE INDEX "chapters_quiz_options_parent_id_idx" ON "cms"."chapters_quiz_options" USING btree ("_parent_id");
  CREATE INDEX "chapters_quiz_order_idx" ON "cms"."chapters_quiz" USING btree ("_order");
  CREATE INDEX "chapters_quiz_parent_id_idx" ON "cms"."chapters_quiz" USING btree ("_parent_id");
  CREATE INDEX "_chapters_v_version_quiz_options_order_idx" ON "cms"."_chapters_v_version_quiz_options" USING btree ("_order");
  CREATE INDEX "_chapters_v_version_quiz_options_parent_id_idx" ON "cms"."_chapters_v_version_quiz_options" USING btree ("_parent_id");
  CREATE INDEX "_chapters_v_version_quiz_order_idx" ON "cms"."_chapters_v_version_quiz" USING btree ("_order");
  CREATE INDEX "_chapters_v_version_quiz_parent_id_idx" ON "cms"."_chapters_v_version_quiz" USING btree ("_parent_id");
  CREATE INDEX "standards_scope_order_idx" ON "cms"."standards_scope" USING btree ("_order");
  CREATE INDEX "standards_scope_parent_id_idx" ON "cms"."standards_scope" USING btree ("_parent_id");
  CREATE INDEX "_standards_v_version_scope_order_idx" ON "cms"."_standards_v_version_scope" USING btree ("_order");
  CREATE INDEX "_standards_v_version_scope_parent_id_idx" ON "cms"."_standards_v_version_scope" USING btree ("_parent_id");
  CREATE INDEX "videos_people_order_idx" ON "cms"."videos_people" USING btree ("_order");
  CREATE INDEX "videos_people_parent_id_idx" ON "cms"."videos_people" USING btree ("_parent_id");
  CREATE INDEX "videos_chapters_order_idx" ON "cms"."videos_chapters" USING btree ("_order");
  CREATE INDEX "videos_chapters_parent_id_idx" ON "cms"."videos_chapters" USING btree ("_parent_id");
  CREATE INDEX "_videos_v_version_people_order_idx" ON "cms"."_videos_v_version_people" USING btree ("_order");
  CREATE INDEX "_videos_v_version_people_parent_id_idx" ON "cms"."_videos_v_version_people" USING btree ("_parent_id");
  CREATE INDEX "_videos_v_version_chapters_order_idx" ON "cms"."_videos_v_version_chapters" USING btree ("_order");
  CREATE INDEX "_videos_v_version_chapters_parent_id_idx" ON "cms"."_videos_v_version_chapters" USING btree ("_parent_id");
  CREATE INDEX "podcasts_people_order_idx" ON "cms"."podcasts_people" USING btree ("_order");
  CREATE INDEX "podcasts_people_parent_id_idx" ON "cms"."podcasts_people" USING btree ("_parent_id");
  CREATE INDEX "podcasts_chapters_order_idx" ON "cms"."podcasts_chapters" USING btree ("_order");
  CREATE INDEX "podcasts_chapters_parent_id_idx" ON "cms"."podcasts_chapters" USING btree ("_parent_id");
  CREATE INDEX "_podcasts_v_version_people_order_idx" ON "cms"."_podcasts_v_version_people" USING btree ("_order");
  CREATE INDEX "_podcasts_v_version_people_parent_id_idx" ON "cms"."_podcasts_v_version_people" USING btree ("_parent_id");
  CREATE INDEX "_podcasts_v_version_chapters_order_idx" ON "cms"."_podcasts_v_version_chapters" USING btree ("_order");
  CREATE INDEX "_podcasts_v_version_chapters_parent_id_idx" ON "cms"."_podcasts_v_version_chapters" USING btree ("_parent_id");
  CREATE INDEX "tracker_overview_figures_order_idx" ON "cms"."tracker_overview_figures" USING btree ("_order");
  CREATE INDEX "tracker_overview_figures_parent_id_idx" ON "cms"."tracker_overview_figures" USING btree ("_parent_id");
  CREATE INDEX "_tracker_overview_v_version_figures_order_idx" ON "cms"."_tracker_overview_v_version_figures" USING btree ("_order");
  CREATE INDEX "_tracker_overview_v_version_figures_parent_id_idx" ON "cms"."_tracker_overview_v_version_figures" USING btree ("_parent_id");
  CREATE INDEX "_tracker_overview_v_created_at_idx" ON "cms"."_tracker_overview_v" USING btree ("created_at");
  CREATE INDEX "_tracker_overview_v_updated_at_idx" ON "cms"."_tracker_overview_v" USING btree ("updated_at");
  ALTER TABLE "cms"."chapters_rels" ADD CONSTRAINT "chapters_rels_glossary_fk" FOREIGN KEY ("glossary_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v_rels" ADD CONSTRAINT "_chapters_v_rels_glossary_fk" FOREIGN KEY ("glossary_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."standards_rels" ADD CONSTRAINT "standards_rels_standards_fk" FOREIGN KEY ("standards_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_standards_v_rels" ADD CONSTRAINT "_standards_v_rels_standards_fk" FOREIGN KEY ("standards_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "chapters_rels_glossary_id_idx" ON "cms"."chapters_rels" USING btree ("glossary_id");
  CREATE INDEX "_chapters_v_rels_glossary_id_idx" ON "cms"."_chapters_v_rels" USING btree ("glossary_id");
  CREATE INDEX "standards_rels_standards_id_idx" ON "cms"."standards_rels" USING btree ("standards_id");
  CREATE INDEX "_standards_v_rels_standards_id_idx" ON "cms"."_standards_v_rels" USING btree ("standards_id");
  CREATE INDEX "videos_published_on_idx" ON "cms"."videos" USING btree ("published_on");
  CREATE INDEX "_videos_v_version_version_published_on_idx" ON "cms"."_videos_v" USING btree ("version_published_on");
  CREATE INDEX "podcasts_published_on_idx" ON "cms"."podcasts" USING btree ("published_on");
  CREATE INDEX "_podcasts_v_version_version_published_on_idx" ON "cms"."_podcasts_v" USING btree ("version_published_on");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."chapters_quiz_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."chapters_quiz" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_chapters_v_version_quiz_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_chapters_v_version_quiz" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."standards_scope" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_standards_v_version_scope" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."videos_people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."videos_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_videos_v_version_people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_videos_v_version_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."podcasts_people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."podcasts_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_podcasts_v_version_people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_podcasts_v_version_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_overview_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_overview" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_overview_v_version_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_overview_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."chapters_quiz_options" CASCADE;
  DROP TABLE "cms"."chapters_quiz" CASCADE;
  DROP TABLE "cms"."_chapters_v_version_quiz_options" CASCADE;
  DROP TABLE "cms"."_chapters_v_version_quiz" CASCADE;
  DROP TABLE "cms"."standards_scope" CASCADE;
  DROP TABLE "cms"."_standards_v_version_scope" CASCADE;
  DROP TABLE "cms"."videos_people" CASCADE;
  DROP TABLE "cms"."videos_chapters" CASCADE;
  DROP TABLE "cms"."_videos_v_version_people" CASCADE;
  DROP TABLE "cms"."_videos_v_version_chapters" CASCADE;
  DROP TABLE "cms"."podcasts_people" CASCADE;
  DROP TABLE "cms"."podcasts_chapters" CASCADE;
  DROP TABLE "cms"."_podcasts_v_version_people" CASCADE;
  DROP TABLE "cms"."_podcasts_v_version_chapters" CASCADE;
  DROP TABLE "cms"."tracker_overview_figures" CASCADE;
  DROP TABLE "cms"."tracker_overview" CASCADE;
  DROP TABLE "cms"."_tracker_overview_v_version_figures" CASCADE;
  DROP TABLE "cms"."_tracker_overview_v" CASCADE;
  ALTER TABLE "cms"."chapters_rels" DROP CONSTRAINT "chapters_rels_glossary_fk";
  
  ALTER TABLE "cms"."_chapters_v_rels" DROP CONSTRAINT "_chapters_v_rels_glossary_fk";
  
  ALTER TABLE "cms"."standards_rels" DROP CONSTRAINT "standards_rels_standards_fk";
  
  ALTER TABLE "cms"."_standards_v_rels" DROP CONSTRAINT "_standards_v_rels_standards_fk";
  
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DEFAULT 'Standard'::text;
  DROP TYPE "cms"."enum_standards_kind";
  CREATE TYPE "cms"."enum_standards_kind" AS ENUM('Standard', 'Regulation', 'Rule', 'Guideline');
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DEFAULT 'Standard'::"cms"."enum_standards_kind";
  ALTER TABLE "cms"."standards" ALTER COLUMN "kind" SET DATA TYPE "cms"."enum_standards_kind" USING "kind"::"cms"."enum_standards_kind";
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DATA TYPE text;
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DEFAULT 'Standard'::text;
  DROP TYPE "cms"."enum__standards_v_version_kind";
  CREATE TYPE "cms"."enum__standards_v_version_kind" AS ENUM('Standard', 'Regulation', 'Rule', 'Guideline');
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DEFAULT 'Standard'::"cms"."enum__standards_v_version_kind";
  ALTER TABLE "cms"."_standards_v" ALTER COLUMN "version_kind" SET DATA TYPE "cms"."enum__standards_v_version_kind" USING "version_kind"::"cms"."enum__standards_v_version_kind";
  DROP INDEX "cms"."chapters_rels_glossary_id_idx";
  DROP INDEX "cms"."_chapters_v_rels_glossary_id_idx";
  DROP INDEX "cms"."standards_rels_standards_id_idx";
  DROP INDEX "cms"."_standards_v_rels_standards_id_idx";
  DROP INDEX "cms"."videos_published_on_idx";
  DROP INDEX "cms"."_videos_v_version_version_published_on_idx";
  DROP INDEX "cms"."podcasts_published_on_idx";
  DROP INDEX "cms"."_podcasts_v_version_version_published_on_idx";
  ALTER TABLE "cms"."chapters" DROP COLUMN "hero_caption";
  ALTER TABLE "cms"."chapters_rels" DROP COLUMN "glossary_id";
  ALTER TABLE "cms"."_chapters_v" DROP COLUMN "version_hero_caption";
  ALTER TABLE "cms"."_chapters_v_rels" DROP COLUMN "glossary_id";
  ALTER TABLE "cms"."glossary" DROP COLUMN "category";
  ALTER TABLE "cms"."glossary" DROP COLUMN "formula";
  ALTER TABLE "cms"."glossary" DROP COLUMN "formula_note";
  ALTER TABLE "cms"."glossary" DROP COLUMN "popular";
  ALTER TABLE "cms"."_glossary_v" DROP COLUMN "version_category";
  ALTER TABLE "cms"."_glossary_v" DROP COLUMN "version_formula";
  ALTER TABLE "cms"."_glossary_v" DROP COLUMN "version_formula_note";
  ALTER TABLE "cms"."_glossary_v" DROP COLUMN "version_popular";
  ALTER TABLE "cms"."standards" DROP COLUMN "dated";
  ALTER TABLE "cms"."standards" DROP COLUMN "document_type";
  ALTER TABLE "cms"."standards" DROP COLUMN "checked_at";
  ALTER TABLE "cms"."standards_rels" DROP COLUMN "standards_id";
  ALTER TABLE "cms"."_standards_v" DROP COLUMN "version_dated";
  ALTER TABLE "cms"."_standards_v" DROP COLUMN "version_document_type";
  ALTER TABLE "cms"."_standards_v" DROP COLUMN "version_checked_at";
  ALTER TABLE "cms"."_standards_v_rels" DROP COLUMN "standards_id";
  ALTER TABLE "cms"."report_leads" DROP COLUMN "consent_version";
  ALTER TABLE "cms"."videos" DROP COLUMN "kind";
  ALTER TABLE "cms"."videos" DROP COLUMN "featured";
  ALTER TABLE "cms"."videos" DROP COLUMN "language";
  ALTER TABLE "cms"."videos" DROP COLUMN "published_on";
  ALTER TABLE "cms"."_videos_v" DROP COLUMN "version_kind";
  ALTER TABLE "cms"."_videos_v" DROP COLUMN "version_featured";
  ALTER TABLE "cms"."_videos_v" DROP COLUMN "version_language";
  ALTER TABLE "cms"."_videos_v" DROP COLUMN "version_published_on";
  ALTER TABLE "cms"."podcasts" DROP COLUMN "also_on";
  ALTER TABLE "cms"."podcasts" DROP COLUMN "published_on";
  ALTER TABLE "cms"."_podcasts_v" DROP COLUMN "version_also_on";
  ALTER TABLE "cms"."_podcasts_v" DROP COLUMN "version_published_on";
  DROP TYPE "cms"."enum_glossary_category";
  DROP TYPE "cms"."enum__glossary_v_version_category";
  DROP TYPE "cms"."enum_videos_kind";
  DROP TYPE "cms"."enum__videos_v_version_kind";`)
}
