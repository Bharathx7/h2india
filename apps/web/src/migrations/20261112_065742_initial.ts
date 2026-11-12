import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_articles_type" AS ENUM('news', 'analysis', 'explainer', 'interview', 'press_release', 'sponsored');
  CREATE TYPE "cms"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__articles_v_version_type" AS ENUM('news', 'analysis', 'explainer', 'interview', 'press_release', 'sponsored');
  CREATE TYPE "cms"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_authors_kind" AS ENUM('staff', 'contributor', 'organisation');
  CREATE TABLE "cms"."articles_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"note" varchar,
  	"internal" boolean
  );
  
  CREATE TABLE "cms"."articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "cms"."enum_articles_type" DEFAULT 'news',
  	"title" varchar,
  	"slug" varchar,
  	"dek" varchar,
  	"hero_image_id" integer,
  	"body" jsonb,
  	"interviewee_name" varchar,
  	"interviewee_role" varchar,
  	"interviewee_organisation" varchar,
  	"issuer" varchar,
  	"sponsor_name" varchar,
  	"sponsor_logo_id" integer,
  	"sponsor_disclosure" varchar DEFAULT 'This article is paid for by the sponsor. H2 India''s editors checked its facts.',
  	"editor_id" integer,
  	"legal_flagged" boolean,
  	"legal_note" varchar,
  	"legal_passed_by_id" integer,
  	"legal_passed_at" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer,
  	"tags_id" integer,
  	"authors_id" integer
  );
  
  CREATE TABLE "cms"."_articles_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"note" varchar,
  	"internal" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_type" "cms"."enum__articles_v_version_type" DEFAULT 'news',
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_dek" varchar,
  	"version_hero_image_id" integer,
  	"version_body" jsonb,
  	"version_interviewee_name" varchar,
  	"version_interviewee_role" varchar,
  	"version_interviewee_organisation" varchar,
  	"version_issuer" varchar,
  	"version_sponsor_name" varchar,
  	"version_sponsor_logo_id" integer,
  	"version_sponsor_disclosure" varchar DEFAULT 'This article is paid for by the sponsor. H2 India''s editors checked its facts.',
  	"version_editor_id" integer,
  	"version_legal_flagged" boolean,
  	"version_legal_note" varchar,
  	"version_legal_passed_by_id" integer,
  	"version_legal_passed_at" timestamp(3) with time zone,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "cms"."_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer,
  	"tags_id" integer,
  	"authors_id" integer
  );
  
  CREATE TABLE "cms"."authors_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."authors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "cms"."enum_authors_kind" DEFAULT 'staff' NOT NULL,
  	"title" varchar,
  	"organisation" varchar,
  	"bio" varchar,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"credit" varchar,
  	"prefix" varchar DEFAULT 'cms',
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
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "cms"."editors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"h2_user_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"role" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"authors_id" integer,
  	"topics_id" integer,
  	"tags_id" integer,
  	"media_id" integer,
  	"editors_id" integer
  );
  
  CREATE TABLE "cms"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"editors_id" integer
  );
  
  CREATE TABLE "cms"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."articles_sources" ADD CONSTRAINT "articles_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles" ADD CONSTRAINT "articles_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."articles" ADD CONSTRAINT "articles_sponsor_logo_id_media_id_fk" FOREIGN KEY ("sponsor_logo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."articles" ADD CONSTRAINT "articles_editor_id_editors_id_fk" FOREIGN KEY ("editor_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."articles" ADD CONSTRAINT "articles_legal_passed_by_id_editors_id_fk" FOREIGN KEY ("legal_passed_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_rels" ADD CONSTRAINT "articles_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_rels" ADD CONSTRAINT "articles_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."articles_rels" ADD CONSTRAINT "articles_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_sources" ADD CONSTRAINT "_articles_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v" ADD CONSTRAINT "_articles_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v" ADD CONSTRAINT "_articles_v_version_sponsor_logo_id_media_id_fk" FOREIGN KEY ("version_sponsor_logo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v" ADD CONSTRAINT "_articles_v_version_editor_id_editors_id_fk" FOREIGN KEY ("version_editor_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v" ADD CONSTRAINT "_articles_v_version_legal_passed_by_id_editors_id_fk" FOREIGN KEY ("version_legal_passed_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."authors_links" ADD CONSTRAINT "authors_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."authors" ADD CONSTRAINT "authors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "cms"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_editors_fk" FOREIGN KEY ("editors_id") REFERENCES "cms"."editors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_editors_fk" FOREIGN KEY ("editors_id") REFERENCES "cms"."editors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_sources_order_idx" ON "cms"."articles_sources" USING btree ("_order");
  CREATE INDEX "articles_sources_parent_id_idx" ON "cms"."articles_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "cms"."articles" USING btree ("slug");
  CREATE INDEX "articles_hero_image_idx" ON "cms"."articles" USING btree ("hero_image_id");
  CREATE INDEX "articles_sponsor_sponsor_logo_idx" ON "cms"."articles" USING btree ("sponsor_logo_id");
  CREATE INDEX "articles_editor_idx" ON "cms"."articles" USING btree ("editor_id");
  CREATE INDEX "articles_legal_legal_passed_by_idx" ON "cms"."articles" USING btree ("legal_passed_by_id");
  CREATE INDEX "articles_updated_at_idx" ON "cms"."articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "cms"."articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "cms"."articles" USING btree ("_status");
  CREATE INDEX "articles_rels_order_idx" ON "cms"."articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "cms"."articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "cms"."articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_topics_id_idx" ON "cms"."articles_rels" USING btree ("topics_id");
  CREATE INDEX "articles_rels_tags_id_idx" ON "cms"."articles_rels" USING btree ("tags_id");
  CREATE INDEX "articles_rels_authors_id_idx" ON "cms"."articles_rels" USING btree ("authors_id");
  CREATE INDEX "_articles_v_version_sources_order_idx" ON "cms"."_articles_v_version_sources" USING btree ("_order");
  CREATE INDEX "_articles_v_version_sources_parent_id_idx" ON "cms"."_articles_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "cms"."_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "cms"."_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_hero_image_idx" ON "cms"."_articles_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_articles_v_version_sponsor_version_sponsor_logo_idx" ON "cms"."_articles_v" USING btree ("version_sponsor_logo_id");
  CREATE INDEX "_articles_v_version_version_editor_idx" ON "cms"."_articles_v" USING btree ("version_editor_id");
  CREATE INDEX "_articles_v_version_legal_version_legal_passed_by_idx" ON "cms"."_articles_v" USING btree ("version_legal_passed_by_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "cms"."_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "cms"."_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "cms"."_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "cms"."_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "cms"."_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "cms"."_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "cms"."_articles_v" USING btree ("autosave");
  CREATE INDEX "_articles_v_rels_order_idx" ON "cms"."_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "cms"."_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "cms"."_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_topics_id_idx" ON "cms"."_articles_v_rels" USING btree ("topics_id");
  CREATE INDEX "_articles_v_rels_tags_id_idx" ON "cms"."_articles_v_rels" USING btree ("tags_id");
  CREATE INDEX "_articles_v_rels_authors_id_idx" ON "cms"."_articles_v_rels" USING btree ("authors_id");
  CREATE INDEX "authors_links_order_idx" ON "cms"."authors_links" USING btree ("_order");
  CREATE INDEX "authors_links_parent_id_idx" ON "cms"."authors_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "authors_slug_idx" ON "cms"."authors" USING btree ("slug");
  CREATE INDEX "authors_photo_idx" ON "cms"."authors" USING btree ("photo_id");
  CREATE INDEX "authors_updated_at_idx" ON "cms"."authors" USING btree ("updated_at");
  CREATE INDEX "authors_created_at_idx" ON "cms"."authors" USING btree ("created_at");
  CREATE UNIQUE INDEX "topics_slug_idx" ON "cms"."topics" USING btree ("slug");
  CREATE INDEX "topics_updated_at_idx" ON "cms"."topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "cms"."topics" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "cms"."tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "cms"."tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "cms"."tags" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "cms"."media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "cms"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "cms"."media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "editors_h2_user_id_idx" ON "cms"."editors" USING btree ("h2_user_id");
  CREATE INDEX "editors_updated_at_idx" ON "cms"."editors" USING btree ("updated_at");
  CREATE INDEX "editors_created_at_idx" ON "cms"."editors" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "cms"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "cms"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "cms"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "cms"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "cms"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "cms"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "cms"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_authors_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("authors_id");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_editors_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("editors_id");
  CREATE INDEX "payload_preferences_key_idx" ON "cms"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "cms"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "cms"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "cms"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "cms"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "cms"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_editors_id_idx" ON "cms"."payload_preferences_rels" USING btree ("editors_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "cms"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "cms"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."articles_sources" CASCADE;
  DROP TABLE "cms"."articles" CASCADE;
  DROP TABLE "cms"."articles_rels" CASCADE;
  DROP TABLE "cms"."_articles_v_version_sources" CASCADE;
  DROP TABLE "cms"."_articles_v" CASCADE;
  DROP TABLE "cms"."_articles_v_rels" CASCADE;
  DROP TABLE "cms"."authors_links" CASCADE;
  DROP TABLE "cms"."authors" CASCADE;
  DROP TABLE "cms"."topics" CASCADE;
  DROP TABLE "cms"."tags" CASCADE;
  DROP TABLE "cms"."media" CASCADE;
  DROP TABLE "cms"."editors" CASCADE;
  DROP TABLE "cms"."payload_kv" CASCADE;
  DROP TABLE "cms"."payload_locked_documents" CASCADE;
  DROP TABLE "cms"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "cms"."payload_preferences" CASCADE;
  DROP TABLE "cms"."payload_preferences_rels" CASCADE;
  DROP TABLE "cms"."payload_migrations" CASCADE;
  DROP TYPE "cms"."enum_articles_type";
  DROP TYPE "cms"."enum_articles_status";
  DROP TYPE "cms"."enum__articles_v_version_type";
  DROP TYPE "cms"."enum__articles_v_version_status";
  DROP TYPE "cms"."enum_authors_kind";`)
}
