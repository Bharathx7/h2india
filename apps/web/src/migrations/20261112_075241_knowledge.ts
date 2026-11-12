import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_chapters_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__chapters_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_glossary_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__glossary_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_standards_kind" AS ENUM('Standard', 'Regulation', 'Rule', 'Guideline');
  CREATE TYPE "cms"."enum_standards_in_force" AS ENUM('In force', 'Draft', 'Withdrawn', 'Superseded');
  CREATE TYPE "cms"."enum_standards_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__standards_v_version_kind" AS ENUM('Standard', 'Regulation', 'Rule', 'Guideline');
  CREATE TYPE "cms"."enum__standards_v_version_in_force" AS ENUM('In force', 'Draft', 'Withdrawn', 'Superseded');
  CREATE TYPE "cms"."enum__standards_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_reports_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__reports_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_videos_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__videos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_podcasts_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__podcasts_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."chapters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"reading_minutes" numeric,
  	"hero_image_id" integer,
  	"body" jsonb,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_chapters_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."chapters_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_chapters_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_order" numeric,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_reading_minutes" numeric,
  	"version_hero_image_id" integer,
  	"version_body" jsonb,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__chapters_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_chapters_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"hero_image_id" integer,
  	"body" jsonb,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."guides_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."guides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"authors_id" integer,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_hero_image_id" integer,
  	"version_body" jsonb,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_guides_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_guides_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"authors_id" integer,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."glossary" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"term" varchar,
  	"slug" varchar,
  	"expansion" varchar,
  	"short" varchar,
  	"body" jsonb,
  	"auto_link" boolean DEFAULT true,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_glossary_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."glossary_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."glossary_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"glossary_id" integer,
  	"standards_id" integer,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_glossary_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_term" varchar,
  	"version_slug" varchar,
  	"version_expansion" varchar,
  	"version_short" varchar,
  	"version_body" jsonb,
  	"version_auto_link" boolean DEFAULT true,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__glossary_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_glossary_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_glossary_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"glossary_id" integer,
  	"standards_id" integer,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."standards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"kind" "cms"."enum_standards_kind" DEFAULT 'Standard',
  	"title" varchar,
  	"slug" varchar,
  	"issuer" varchar,
  	"in_force" "cms"."enum_standards_in_force" DEFAULT 'In force',
  	"summary" varchar,
  	"body" jsonb,
  	"source_url" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_standards_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."standards_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."standards_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_standards_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_code" varchar,
  	"version_kind" "cms"."enum__standards_v_version_kind" DEFAULT 'Standard',
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_issuer" varchar,
  	"version_in_force" "cms"."enum__standards_v_version_in_force" DEFAULT 'In force',
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_source_url" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__standards_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_standards_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_standards_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."reports_findings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"finding" varchar
  );
  
  CREATE TABLE "cms"."reports_contents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"chapter" varchar
  );
  
  CREATE TABLE "cms"."reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"kicker" varchar,
  	"subtitle" varchar,
  	"summary" varchar,
  	"written_by" varchar,
  	"gated" boolean DEFAULT true,
  	"file_id" integer,
  	"sponsor_name" varchar,
  	"sponsor_disclosure" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_reports_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."reports_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_reports_v_version_findings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"finding" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_reports_v_version_contents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"chapter" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_reports_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_kicker" varchar,
  	"version_subtitle" varchar,
  	"version_summary" varchar,
  	"version_written_by" varchar,
  	"version_gated" boolean DEFAULT true,
  	"version_file_id" integer,
  	"version_sponsor_name" varchar,
  	"version_sponsor_disclosure" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__reports_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_reports_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."report_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"pages" numeric,
  	"prefix" varchar DEFAULT 'cms-reports',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "cms"."report_leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"report_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"company" varchar,
  	"role" varchar,
  	"sponsor_consent" boolean DEFAULT false,
  	"consent_text" varchar,
  	"user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"series" varchar,
  	"description" varchar,
  	"url" varchar,
  	"duration_minutes" numeric,
  	"transcript" varchar,
  	"thumbnail_id" integer,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_videos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."videos_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_videos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_series" varchar,
  	"version_description" varchar,
  	"version_url" varchar,
  	"version_duration_minutes" numeric,
  	"version_transcript" varchar,
  	"version_thumbnail_id" integer,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__videos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_videos_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."podcasts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"show" varchar,
  	"episode" numeric,
  	"description" varchar,
  	"url" varchar,
  	"duration_minutes" numeric,
  	"transcript" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_podcasts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."podcasts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."podcasts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_podcasts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_show" varchar,
  	"version_episode" numeric,
  	"version_description" varchar,
  	"version_url" varchar,
  	"version_duration_minutes" numeric,
  	"version_transcript" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__podcasts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_podcasts_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_podcasts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "chapters_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "guides_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "glossary_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "standards_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "reports_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "report_files_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "report_leads_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "videos_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "podcasts_id" integer;
  ALTER TABLE "cms"."chapters" ADD CONSTRAINT "chapters_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."chapters_rels" ADD CONSTRAINT "chapters_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."chapters_rels" ADD CONSTRAINT "chapters_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v" ADD CONSTRAINT "_chapters_v_parent_id_chapters_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v" ADD CONSTRAINT "_chapters_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v_rels" ADD CONSTRAINT "_chapters_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_chapters_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_chapters_v_rels" ADD CONSTRAINT "_chapters_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."guides" ADD CONSTRAINT "guides_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."guides_texts" ADD CONSTRAINT "guides_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."guides_rels" ADD CONSTRAINT "guides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."guides_rels" ADD CONSTRAINT "guides_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."guides_rels" ADD CONSTRAINT "guides_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v" ADD CONSTRAINT "_guides_v_parent_id_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v" ADD CONSTRAINT "_guides_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v_texts" ADD CONSTRAINT "_guides_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."glossary_texts" ADD CONSTRAINT "glossary_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."glossary_rels" ADD CONSTRAINT "glossary_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."glossary_rels" ADD CONSTRAINT "glossary_rels_glossary_fk" FOREIGN KEY ("glossary_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."glossary_rels" ADD CONSTRAINT "glossary_rels_standards_fk" FOREIGN KEY ("standards_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."glossary_rels" ADD CONSTRAINT "glossary_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_glossary_v" ADD CONSTRAINT "_glossary_v_parent_id_glossary_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."glossary"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_glossary_v_texts" ADD CONSTRAINT "_glossary_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_glossary_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_glossary_v_rels" ADD CONSTRAINT "_glossary_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_glossary_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_glossary_v_rels" ADD CONSTRAINT "_glossary_v_rels_glossary_fk" FOREIGN KEY ("glossary_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_glossary_v_rels" ADD CONSTRAINT "_glossary_v_rels_standards_fk" FOREIGN KEY ("standards_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_glossary_v_rels" ADD CONSTRAINT "_glossary_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."standards_texts" ADD CONSTRAINT "standards_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."standards_rels" ADD CONSTRAINT "standards_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."standards_rels" ADD CONSTRAINT "standards_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_standards_v" ADD CONSTRAINT "_standards_v_parent_id_standards_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."standards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_standards_v_texts" ADD CONSTRAINT "_standards_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_standards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_standards_v_rels" ADD CONSTRAINT "_standards_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_standards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_standards_v_rels" ADD CONSTRAINT "_standards_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."reports_findings" ADD CONSTRAINT "reports_findings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."reports_contents" ADD CONSTRAINT "reports_contents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."reports" ADD CONSTRAINT "reports_file_id_report_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "cms"."report_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."reports_rels" ADD CONSTRAINT "reports_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."reports_rels" ADD CONSTRAINT "reports_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_reports_v_version_findings" ADD CONSTRAINT "_reports_v_version_findings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_reports_v_version_contents" ADD CONSTRAINT "_reports_v_version_contents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_reports_v" ADD CONSTRAINT "_reports_v_parent_id_reports_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."reports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_reports_v" ADD CONSTRAINT "_reports_v_version_file_id_report_files_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "cms"."report_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_reports_v_rels" ADD CONSTRAINT "_reports_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_reports_v_rels" ADD CONSTRAINT "_reports_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."report_leads" ADD CONSTRAINT "report_leads_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "cms"."reports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."videos" ADD CONSTRAINT "videos_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."videos_rels" ADD CONSTRAINT "videos_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."videos_rels" ADD CONSTRAINT "videos_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_videos_v" ADD CONSTRAINT "_videos_v_parent_id_videos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_videos_v" ADD CONSTRAINT "_videos_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_videos_v_rels" ADD CONSTRAINT "_videos_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_videos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_videos_v_rels" ADD CONSTRAINT "_videos_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."podcasts_texts" ADD CONSTRAINT "podcasts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."podcasts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."podcasts_rels" ADD CONSTRAINT "podcasts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."podcasts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."podcasts_rels" ADD CONSTRAINT "podcasts_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_podcasts_v" ADD CONSTRAINT "_podcasts_v_parent_id_podcasts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."podcasts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_podcasts_v_texts" ADD CONSTRAINT "_podcasts_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_podcasts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_podcasts_v_rels" ADD CONSTRAINT "_podcasts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_podcasts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_podcasts_v_rels" ADD CONSTRAINT "_podcasts_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "chapters_order_idx" ON "cms"."chapters" USING btree ("order");
  CREATE UNIQUE INDEX "chapters_slug_idx" ON "cms"."chapters" USING btree ("slug");
  CREATE INDEX "chapters_hero_image_idx" ON "cms"."chapters" USING btree ("hero_image_id");
  CREATE INDEX "chapters_updated_at_idx" ON "cms"."chapters" USING btree ("updated_at");
  CREATE INDEX "chapters_created_at_idx" ON "cms"."chapters" USING btree ("created_at");
  CREATE INDEX "chapters__status_idx" ON "cms"."chapters" USING btree ("_status");
  CREATE INDEX "chapters_rels_order_idx" ON "cms"."chapters_rels" USING btree ("order");
  CREATE INDEX "chapters_rels_parent_idx" ON "cms"."chapters_rels" USING btree ("parent_id");
  CREATE INDEX "chapters_rels_path_idx" ON "cms"."chapters_rels" USING btree ("path");
  CREATE INDEX "chapters_rels_topics_id_idx" ON "cms"."chapters_rels" USING btree ("topics_id");
  CREATE INDEX "_chapters_v_parent_idx" ON "cms"."_chapters_v" USING btree ("parent_id");
  CREATE INDEX "_chapters_v_version_version_order_idx" ON "cms"."_chapters_v" USING btree ("version_order");
  CREATE INDEX "_chapters_v_version_version_slug_idx" ON "cms"."_chapters_v" USING btree ("version_slug");
  CREATE INDEX "_chapters_v_version_version_hero_image_idx" ON "cms"."_chapters_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_chapters_v_version_version_updated_at_idx" ON "cms"."_chapters_v" USING btree ("version_updated_at");
  CREATE INDEX "_chapters_v_version_version_created_at_idx" ON "cms"."_chapters_v" USING btree ("version_created_at");
  CREATE INDEX "_chapters_v_version_version__status_idx" ON "cms"."_chapters_v" USING btree ("version__status");
  CREATE INDEX "_chapters_v_created_at_idx" ON "cms"."_chapters_v" USING btree ("created_at");
  CREATE INDEX "_chapters_v_updated_at_idx" ON "cms"."_chapters_v" USING btree ("updated_at");
  CREATE INDEX "_chapters_v_latest_idx" ON "cms"."_chapters_v" USING btree ("latest");
  CREATE INDEX "_chapters_v_rels_order_idx" ON "cms"."_chapters_v_rels" USING btree ("order");
  CREATE INDEX "_chapters_v_rels_parent_idx" ON "cms"."_chapters_v_rels" USING btree ("parent_id");
  CREATE INDEX "_chapters_v_rels_path_idx" ON "cms"."_chapters_v_rels" USING btree ("path");
  CREATE INDEX "_chapters_v_rels_topics_id_idx" ON "cms"."_chapters_v_rels" USING btree ("topics_id");
  CREATE UNIQUE INDEX "guides_slug_idx" ON "cms"."guides" USING btree ("slug");
  CREATE INDEX "guides_hero_image_idx" ON "cms"."guides" USING btree ("hero_image_id");
  CREATE INDEX "guides_updated_at_idx" ON "cms"."guides" USING btree ("updated_at");
  CREATE INDEX "guides_created_at_idx" ON "cms"."guides" USING btree ("created_at");
  CREATE INDEX "guides__status_idx" ON "cms"."guides" USING btree ("_status");
  CREATE INDEX "guides_texts_order_parent" ON "cms"."guides_texts" USING btree ("order","parent_id");
  CREATE INDEX "guides_rels_order_idx" ON "cms"."guides_rels" USING btree ("order");
  CREATE INDEX "guides_rels_parent_idx" ON "cms"."guides_rels" USING btree ("parent_id");
  CREATE INDEX "guides_rels_path_idx" ON "cms"."guides_rels" USING btree ("path");
  CREATE INDEX "guides_rels_authors_id_idx" ON "cms"."guides_rels" USING btree ("authors_id");
  CREATE INDEX "guides_rels_topics_id_idx" ON "cms"."guides_rels" USING btree ("topics_id");
  CREATE INDEX "_guides_v_parent_idx" ON "cms"."_guides_v" USING btree ("parent_id");
  CREATE INDEX "_guides_v_version_version_slug_idx" ON "cms"."_guides_v" USING btree ("version_slug");
  CREATE INDEX "_guides_v_version_version_hero_image_idx" ON "cms"."_guides_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_guides_v_version_version_updated_at_idx" ON "cms"."_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_guides_v_version_version_created_at_idx" ON "cms"."_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_guides_v_version_version__status_idx" ON "cms"."_guides_v" USING btree ("version__status");
  CREATE INDEX "_guides_v_created_at_idx" ON "cms"."_guides_v" USING btree ("created_at");
  CREATE INDEX "_guides_v_updated_at_idx" ON "cms"."_guides_v" USING btree ("updated_at");
  CREATE INDEX "_guides_v_latest_idx" ON "cms"."_guides_v" USING btree ("latest");
  CREATE INDEX "_guides_v_texts_order_parent" ON "cms"."_guides_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_guides_v_rels_order_idx" ON "cms"."_guides_v_rels" USING btree ("order");
  CREATE INDEX "_guides_v_rels_parent_idx" ON "cms"."_guides_v_rels" USING btree ("parent_id");
  CREATE INDEX "_guides_v_rels_path_idx" ON "cms"."_guides_v_rels" USING btree ("path");
  CREATE INDEX "_guides_v_rels_authors_id_idx" ON "cms"."_guides_v_rels" USING btree ("authors_id");
  CREATE INDEX "_guides_v_rels_topics_id_idx" ON "cms"."_guides_v_rels" USING btree ("topics_id");
  CREATE INDEX "glossary_term_idx" ON "cms"."glossary" USING btree ("term");
  CREATE UNIQUE INDEX "glossary_slug_idx" ON "cms"."glossary" USING btree ("slug");
  CREATE INDEX "glossary_updated_at_idx" ON "cms"."glossary" USING btree ("updated_at");
  CREATE INDEX "glossary_created_at_idx" ON "cms"."glossary" USING btree ("created_at");
  CREATE INDEX "glossary__status_idx" ON "cms"."glossary" USING btree ("_status");
  CREATE INDEX "glossary_texts_order_parent" ON "cms"."glossary_texts" USING btree ("order","parent_id");
  CREATE INDEX "glossary_rels_order_idx" ON "cms"."glossary_rels" USING btree ("order");
  CREATE INDEX "glossary_rels_parent_idx" ON "cms"."glossary_rels" USING btree ("parent_id");
  CREATE INDEX "glossary_rels_path_idx" ON "cms"."glossary_rels" USING btree ("path");
  CREATE INDEX "glossary_rels_glossary_id_idx" ON "cms"."glossary_rels" USING btree ("glossary_id");
  CREATE INDEX "glossary_rels_standards_id_idx" ON "cms"."glossary_rels" USING btree ("standards_id");
  CREATE INDEX "glossary_rels_topics_id_idx" ON "cms"."glossary_rels" USING btree ("topics_id");
  CREATE INDEX "_glossary_v_parent_idx" ON "cms"."_glossary_v" USING btree ("parent_id");
  CREATE INDEX "_glossary_v_version_version_term_idx" ON "cms"."_glossary_v" USING btree ("version_term");
  CREATE INDEX "_glossary_v_version_version_slug_idx" ON "cms"."_glossary_v" USING btree ("version_slug");
  CREATE INDEX "_glossary_v_version_version_updated_at_idx" ON "cms"."_glossary_v" USING btree ("version_updated_at");
  CREATE INDEX "_glossary_v_version_version_created_at_idx" ON "cms"."_glossary_v" USING btree ("version_created_at");
  CREATE INDEX "_glossary_v_version_version__status_idx" ON "cms"."_glossary_v" USING btree ("version__status");
  CREATE INDEX "_glossary_v_created_at_idx" ON "cms"."_glossary_v" USING btree ("created_at");
  CREATE INDEX "_glossary_v_updated_at_idx" ON "cms"."_glossary_v" USING btree ("updated_at");
  CREATE INDEX "_glossary_v_latest_idx" ON "cms"."_glossary_v" USING btree ("latest");
  CREATE INDEX "_glossary_v_texts_order_parent" ON "cms"."_glossary_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_glossary_v_rels_order_idx" ON "cms"."_glossary_v_rels" USING btree ("order");
  CREATE INDEX "_glossary_v_rels_parent_idx" ON "cms"."_glossary_v_rels" USING btree ("parent_id");
  CREATE INDEX "_glossary_v_rels_path_idx" ON "cms"."_glossary_v_rels" USING btree ("path");
  CREATE INDEX "_glossary_v_rels_glossary_id_idx" ON "cms"."_glossary_v_rels" USING btree ("glossary_id");
  CREATE INDEX "_glossary_v_rels_standards_id_idx" ON "cms"."_glossary_v_rels" USING btree ("standards_id");
  CREATE INDEX "_glossary_v_rels_topics_id_idx" ON "cms"."_glossary_v_rels" USING btree ("topics_id");
  CREATE INDEX "standards_code_idx" ON "cms"."standards" USING btree ("code");
  CREATE UNIQUE INDEX "standards_slug_idx" ON "cms"."standards" USING btree ("slug");
  CREATE INDEX "standards_updated_at_idx" ON "cms"."standards" USING btree ("updated_at");
  CREATE INDEX "standards_created_at_idx" ON "cms"."standards" USING btree ("created_at");
  CREATE INDEX "standards__status_idx" ON "cms"."standards" USING btree ("_status");
  CREATE INDEX "standards_texts_order_parent" ON "cms"."standards_texts" USING btree ("order","parent_id");
  CREATE INDEX "standards_rels_order_idx" ON "cms"."standards_rels" USING btree ("order");
  CREATE INDEX "standards_rels_parent_idx" ON "cms"."standards_rels" USING btree ("parent_id");
  CREATE INDEX "standards_rels_path_idx" ON "cms"."standards_rels" USING btree ("path");
  CREATE INDEX "standards_rels_topics_id_idx" ON "cms"."standards_rels" USING btree ("topics_id");
  CREATE INDEX "_standards_v_parent_idx" ON "cms"."_standards_v" USING btree ("parent_id");
  CREATE INDEX "_standards_v_version_version_code_idx" ON "cms"."_standards_v" USING btree ("version_code");
  CREATE INDEX "_standards_v_version_version_slug_idx" ON "cms"."_standards_v" USING btree ("version_slug");
  CREATE INDEX "_standards_v_version_version_updated_at_idx" ON "cms"."_standards_v" USING btree ("version_updated_at");
  CREATE INDEX "_standards_v_version_version_created_at_idx" ON "cms"."_standards_v" USING btree ("version_created_at");
  CREATE INDEX "_standards_v_version_version__status_idx" ON "cms"."_standards_v" USING btree ("version__status");
  CREATE INDEX "_standards_v_created_at_idx" ON "cms"."_standards_v" USING btree ("created_at");
  CREATE INDEX "_standards_v_updated_at_idx" ON "cms"."_standards_v" USING btree ("updated_at");
  CREATE INDEX "_standards_v_latest_idx" ON "cms"."_standards_v" USING btree ("latest");
  CREATE INDEX "_standards_v_texts_order_parent" ON "cms"."_standards_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_standards_v_rels_order_idx" ON "cms"."_standards_v_rels" USING btree ("order");
  CREATE INDEX "_standards_v_rels_parent_idx" ON "cms"."_standards_v_rels" USING btree ("parent_id");
  CREATE INDEX "_standards_v_rels_path_idx" ON "cms"."_standards_v_rels" USING btree ("path");
  CREATE INDEX "_standards_v_rels_topics_id_idx" ON "cms"."_standards_v_rels" USING btree ("topics_id");
  CREATE INDEX "reports_findings_order_idx" ON "cms"."reports_findings" USING btree ("_order");
  CREATE INDEX "reports_findings_parent_id_idx" ON "cms"."reports_findings" USING btree ("_parent_id");
  CREATE INDEX "reports_contents_order_idx" ON "cms"."reports_contents" USING btree ("_order");
  CREATE INDEX "reports_contents_parent_id_idx" ON "cms"."reports_contents" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "reports_slug_idx" ON "cms"."reports" USING btree ("slug");
  CREATE INDEX "reports_file_idx" ON "cms"."reports" USING btree ("file_id");
  CREATE INDEX "reports_updated_at_idx" ON "cms"."reports" USING btree ("updated_at");
  CREATE INDEX "reports_created_at_idx" ON "cms"."reports" USING btree ("created_at");
  CREATE INDEX "reports__status_idx" ON "cms"."reports" USING btree ("_status");
  CREATE INDEX "reports_rels_order_idx" ON "cms"."reports_rels" USING btree ("order");
  CREATE INDEX "reports_rels_parent_idx" ON "cms"."reports_rels" USING btree ("parent_id");
  CREATE INDEX "reports_rels_path_idx" ON "cms"."reports_rels" USING btree ("path");
  CREATE INDEX "reports_rels_topics_id_idx" ON "cms"."reports_rels" USING btree ("topics_id");
  CREATE INDEX "_reports_v_version_findings_order_idx" ON "cms"."_reports_v_version_findings" USING btree ("_order");
  CREATE INDEX "_reports_v_version_findings_parent_id_idx" ON "cms"."_reports_v_version_findings" USING btree ("_parent_id");
  CREATE INDEX "_reports_v_version_contents_order_idx" ON "cms"."_reports_v_version_contents" USING btree ("_order");
  CREATE INDEX "_reports_v_version_contents_parent_id_idx" ON "cms"."_reports_v_version_contents" USING btree ("_parent_id");
  CREATE INDEX "_reports_v_parent_idx" ON "cms"."_reports_v" USING btree ("parent_id");
  CREATE INDEX "_reports_v_version_version_slug_idx" ON "cms"."_reports_v" USING btree ("version_slug");
  CREATE INDEX "_reports_v_version_version_file_idx" ON "cms"."_reports_v" USING btree ("version_file_id");
  CREATE INDEX "_reports_v_version_version_updated_at_idx" ON "cms"."_reports_v" USING btree ("version_updated_at");
  CREATE INDEX "_reports_v_version_version_created_at_idx" ON "cms"."_reports_v" USING btree ("version_created_at");
  CREATE INDEX "_reports_v_version_version__status_idx" ON "cms"."_reports_v" USING btree ("version__status");
  CREATE INDEX "_reports_v_created_at_idx" ON "cms"."_reports_v" USING btree ("created_at");
  CREATE INDEX "_reports_v_updated_at_idx" ON "cms"."_reports_v" USING btree ("updated_at");
  CREATE INDEX "_reports_v_latest_idx" ON "cms"."_reports_v" USING btree ("latest");
  CREATE INDEX "_reports_v_rels_order_idx" ON "cms"."_reports_v_rels" USING btree ("order");
  CREATE INDEX "_reports_v_rels_parent_idx" ON "cms"."_reports_v_rels" USING btree ("parent_id");
  CREATE INDEX "_reports_v_rels_path_idx" ON "cms"."_reports_v_rels" USING btree ("path");
  CREATE INDEX "_reports_v_rels_topics_id_idx" ON "cms"."_reports_v_rels" USING btree ("topics_id");
  CREATE INDEX "report_files_updated_at_idx" ON "cms"."report_files" USING btree ("updated_at");
  CREATE INDEX "report_files_created_at_idx" ON "cms"."report_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "report_files_filename_idx" ON "cms"."report_files" USING btree ("filename");
  CREATE INDEX "report_leads_report_idx" ON "cms"."report_leads" USING btree ("report_id");
  CREATE INDEX "report_leads_updated_at_idx" ON "cms"."report_leads" USING btree ("updated_at");
  CREATE INDEX "report_leads_created_at_idx" ON "cms"."report_leads" USING btree ("created_at");
  CREATE UNIQUE INDEX "videos_slug_idx" ON "cms"."videos" USING btree ("slug");
  CREATE INDEX "videos_series_idx" ON "cms"."videos" USING btree ("series");
  CREATE INDEX "videos_thumbnail_idx" ON "cms"."videos" USING btree ("thumbnail_id");
  CREATE INDEX "videos_updated_at_idx" ON "cms"."videos" USING btree ("updated_at");
  CREATE INDEX "videos_created_at_idx" ON "cms"."videos" USING btree ("created_at");
  CREATE INDEX "videos__status_idx" ON "cms"."videos" USING btree ("_status");
  CREATE INDEX "videos_rels_order_idx" ON "cms"."videos_rels" USING btree ("order");
  CREATE INDEX "videos_rels_parent_idx" ON "cms"."videos_rels" USING btree ("parent_id");
  CREATE INDEX "videos_rels_path_idx" ON "cms"."videos_rels" USING btree ("path");
  CREATE INDEX "videos_rels_topics_id_idx" ON "cms"."videos_rels" USING btree ("topics_id");
  CREATE INDEX "_videos_v_parent_idx" ON "cms"."_videos_v" USING btree ("parent_id");
  CREATE INDEX "_videos_v_version_version_slug_idx" ON "cms"."_videos_v" USING btree ("version_slug");
  CREATE INDEX "_videos_v_version_version_series_idx" ON "cms"."_videos_v" USING btree ("version_series");
  CREATE INDEX "_videos_v_version_version_thumbnail_idx" ON "cms"."_videos_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_videos_v_version_version_updated_at_idx" ON "cms"."_videos_v" USING btree ("version_updated_at");
  CREATE INDEX "_videos_v_version_version_created_at_idx" ON "cms"."_videos_v" USING btree ("version_created_at");
  CREATE INDEX "_videos_v_version_version__status_idx" ON "cms"."_videos_v" USING btree ("version__status");
  CREATE INDEX "_videos_v_created_at_idx" ON "cms"."_videos_v" USING btree ("created_at");
  CREATE INDEX "_videos_v_updated_at_idx" ON "cms"."_videos_v" USING btree ("updated_at");
  CREATE INDEX "_videos_v_latest_idx" ON "cms"."_videos_v" USING btree ("latest");
  CREATE INDEX "_videos_v_rels_order_idx" ON "cms"."_videos_v_rels" USING btree ("order");
  CREATE INDEX "_videos_v_rels_parent_idx" ON "cms"."_videos_v_rels" USING btree ("parent_id");
  CREATE INDEX "_videos_v_rels_path_idx" ON "cms"."_videos_v_rels" USING btree ("path");
  CREATE INDEX "_videos_v_rels_topics_id_idx" ON "cms"."_videos_v_rels" USING btree ("topics_id");
  CREATE UNIQUE INDEX "podcasts_slug_idx" ON "cms"."podcasts" USING btree ("slug");
  CREATE INDEX "podcasts_updated_at_idx" ON "cms"."podcasts" USING btree ("updated_at");
  CREATE INDEX "podcasts_created_at_idx" ON "cms"."podcasts" USING btree ("created_at");
  CREATE INDEX "podcasts__status_idx" ON "cms"."podcasts" USING btree ("_status");
  CREATE INDEX "podcasts_texts_order_parent" ON "cms"."podcasts_texts" USING btree ("order","parent_id");
  CREATE INDEX "podcasts_rels_order_idx" ON "cms"."podcasts_rels" USING btree ("order");
  CREATE INDEX "podcasts_rels_parent_idx" ON "cms"."podcasts_rels" USING btree ("parent_id");
  CREATE INDEX "podcasts_rels_path_idx" ON "cms"."podcasts_rels" USING btree ("path");
  CREATE INDEX "podcasts_rels_topics_id_idx" ON "cms"."podcasts_rels" USING btree ("topics_id");
  CREATE INDEX "_podcasts_v_parent_idx" ON "cms"."_podcasts_v" USING btree ("parent_id");
  CREATE INDEX "_podcasts_v_version_version_slug_idx" ON "cms"."_podcasts_v" USING btree ("version_slug");
  CREATE INDEX "_podcasts_v_version_version_updated_at_idx" ON "cms"."_podcasts_v" USING btree ("version_updated_at");
  CREATE INDEX "_podcasts_v_version_version_created_at_idx" ON "cms"."_podcasts_v" USING btree ("version_created_at");
  CREATE INDEX "_podcasts_v_version_version__status_idx" ON "cms"."_podcasts_v" USING btree ("version__status");
  CREATE INDEX "_podcasts_v_created_at_idx" ON "cms"."_podcasts_v" USING btree ("created_at");
  CREATE INDEX "_podcasts_v_updated_at_idx" ON "cms"."_podcasts_v" USING btree ("updated_at");
  CREATE INDEX "_podcasts_v_latest_idx" ON "cms"."_podcasts_v" USING btree ("latest");
  CREATE INDEX "_podcasts_v_texts_order_parent" ON "cms"."_podcasts_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_podcasts_v_rels_order_idx" ON "cms"."_podcasts_v_rels" USING btree ("order");
  CREATE INDEX "_podcasts_v_rels_parent_idx" ON "cms"."_podcasts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_podcasts_v_rels_path_idx" ON "cms"."_podcasts_v_rels" USING btree ("path");
  CREATE INDEX "_podcasts_v_rels_topics_id_idx" ON "cms"."_podcasts_v_rels" USING btree ("topics_id");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chapters_fk" FOREIGN KEY ("chapters_id") REFERENCES "cms"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guides_fk" FOREIGN KEY ("guides_id") REFERENCES "cms"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_glossary_fk" FOREIGN KEY ("glossary_id") REFERENCES "cms"."glossary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_standards_fk" FOREIGN KEY ("standards_id") REFERENCES "cms"."standards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reports_fk" FOREIGN KEY ("reports_id") REFERENCES "cms"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_report_files_fk" FOREIGN KEY ("report_files_id") REFERENCES "cms"."report_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_report_leads_fk" FOREIGN KEY ("report_leads_id") REFERENCES "cms"."report_leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_videos_fk" FOREIGN KEY ("videos_id") REFERENCES "cms"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_podcasts_fk" FOREIGN KEY ("podcasts_id") REFERENCES "cms"."podcasts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_chapters_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("chapters_id");
  CREATE INDEX "payload_locked_documents_rels_guides_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("guides_id");
  CREATE INDEX "payload_locked_documents_rels_glossary_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("glossary_id");
  CREATE INDEX "payload_locked_documents_rels_standards_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("standards_id");
  CREATE INDEX "payload_locked_documents_rels_reports_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("reports_id");
  CREATE INDEX "payload_locked_documents_rels_report_files_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("report_files_id");
  CREATE INDEX "payload_locked_documents_rels_report_leads_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("report_leads_id");
  CREATE INDEX "payload_locked_documents_rels_videos_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("videos_id");
  CREATE INDEX "payload_locked_documents_rels_podcasts_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("podcasts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."chapters_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_chapters_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_chapters_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."guides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."guides_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."guides_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_guides_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_guides_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_guides_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."glossary" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."glossary_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."glossary_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_glossary_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_glossary_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_glossary_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."standards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."standards_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."standards_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_standards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_standards_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_standards_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."reports_findings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."reports_contents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."reports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."reports_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_reports_v_version_findings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_reports_v_version_contents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_reports_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_reports_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."report_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."report_leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."videos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."videos_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_videos_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_videos_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."podcasts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."podcasts_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."podcasts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_podcasts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_podcasts_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_podcasts_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."chapters" CASCADE;
  DROP TABLE "cms"."chapters_rels" CASCADE;
  DROP TABLE "cms"."_chapters_v" CASCADE;
  DROP TABLE "cms"."_chapters_v_rels" CASCADE;
  DROP TABLE "cms"."guides" CASCADE;
  DROP TABLE "cms"."guides_texts" CASCADE;
  DROP TABLE "cms"."guides_rels" CASCADE;
  DROP TABLE "cms"."_guides_v" CASCADE;
  DROP TABLE "cms"."_guides_v_texts" CASCADE;
  DROP TABLE "cms"."_guides_v_rels" CASCADE;
  DROP TABLE "cms"."glossary" CASCADE;
  DROP TABLE "cms"."glossary_texts" CASCADE;
  DROP TABLE "cms"."glossary_rels" CASCADE;
  DROP TABLE "cms"."_glossary_v" CASCADE;
  DROP TABLE "cms"."_glossary_v_texts" CASCADE;
  DROP TABLE "cms"."_glossary_v_rels" CASCADE;
  DROP TABLE "cms"."standards" CASCADE;
  DROP TABLE "cms"."standards_texts" CASCADE;
  DROP TABLE "cms"."standards_rels" CASCADE;
  DROP TABLE "cms"."_standards_v" CASCADE;
  DROP TABLE "cms"."_standards_v_texts" CASCADE;
  DROP TABLE "cms"."_standards_v_rels" CASCADE;
  DROP TABLE "cms"."reports_findings" CASCADE;
  DROP TABLE "cms"."reports_contents" CASCADE;
  DROP TABLE "cms"."reports" CASCADE;
  DROP TABLE "cms"."reports_rels" CASCADE;
  DROP TABLE "cms"."_reports_v_version_findings" CASCADE;
  DROP TABLE "cms"."_reports_v_version_contents" CASCADE;
  DROP TABLE "cms"."_reports_v" CASCADE;
  DROP TABLE "cms"."_reports_v_rels" CASCADE;
  DROP TABLE "cms"."report_files" CASCADE;
  DROP TABLE "cms"."report_leads" CASCADE;
  DROP TABLE "cms"."videos" CASCADE;
  DROP TABLE "cms"."videos_rels" CASCADE;
  DROP TABLE "cms"."_videos_v" CASCADE;
  DROP TABLE "cms"."_videos_v_rels" CASCADE;
  DROP TABLE "cms"."podcasts" CASCADE;
  DROP TABLE "cms"."podcasts_texts" CASCADE;
  DROP TABLE "cms"."podcasts_rels" CASCADE;
  DROP TABLE "cms"."_podcasts_v" CASCADE;
  DROP TABLE "cms"."_podcasts_v_texts" CASCADE;
  DROP TABLE "cms"."_podcasts_v_rels" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_chapters_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_guides_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_glossary_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_standards_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reports_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_report_files_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_report_leads_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_videos_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_podcasts_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_chapters_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_guides_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_glossary_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_standards_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_reports_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_report_files_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_report_leads_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_videos_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_podcasts_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "chapters_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "guides_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "glossary_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "standards_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "reports_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "report_files_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "report_leads_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "videos_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "podcasts_id";
  DROP TYPE "cms"."enum_chapters_status";
  DROP TYPE "cms"."enum__chapters_v_version_status";
  DROP TYPE "cms"."enum_guides_status";
  DROP TYPE "cms"."enum__guides_v_version_status";
  DROP TYPE "cms"."enum_glossary_status";
  DROP TYPE "cms"."enum__glossary_v_version_status";
  DROP TYPE "cms"."enum_standards_kind";
  DROP TYPE "cms"."enum_standards_in_force";
  DROP TYPE "cms"."enum_standards_status";
  DROP TYPE "cms"."enum__standards_v_version_kind";
  DROP TYPE "cms"."enum__standards_v_version_in_force";
  DROP TYPE "cms"."enum__standards_v_version_status";
  DROP TYPE "cms"."enum_reports_status";
  DROP TYPE "cms"."enum__reports_v_version_status";
  DROP TYPE "cms"."enum_videos_status";
  DROP TYPE "cms"."enum__videos_v_version_status";
  DROP TYPE "cms"."enum_podcasts_status";
  DROP TYPE "cms"."enum__podcasts_v_version_status";`)
}
