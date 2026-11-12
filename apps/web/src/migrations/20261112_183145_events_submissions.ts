import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_events_event_type" AS ENUM('Conference and expo', 'Webinar', 'Workshop and training', 'Roundtable', 'Site visit');
  CREATE TYPE "cms"."enum_events_attendance" AS ENUM('In person', 'Online', 'Hybrid');
  CREATE TYPE "cms"."enum__events_v_version_event_type" AS ENUM('Conference and expo', 'Webinar', 'Workshop and training', 'Roundtable', 'Site visit');
  CREATE TYPE "cms"."enum__events_v_version_attendance" AS ENUM('In person', 'Online', 'Hybrid');
  CREATE TYPE "cms"."enum_submissions_kind" AS ENUM('event', 'press_release', 'correction', 'pitch');
  CREATE TYPE "cms"."enum_submissions_status" AS ENUM('Under review', 'Published', 'Needs changes', 'Declined');
  CREATE TABLE "cms"."events_agenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" timestamp(3) with time zone,
  	"time" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "cms"."events_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"profile_slug" varchar
  );
  
  CREATE TABLE "cms"."events_exhibitors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"stall" varchar,
  	"about" varchar,
  	"profile_slug" varchar
  );
  
  CREATE TABLE "cms"."events_webinar_learn" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "cms"."events_webinar_replay_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "cms"."events_webinar_replay_qa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "cms"."events_live_announcements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" varchar,
  	"company" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."events_live_updates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_agenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" timestamp(3) with time zone,
  	"time" varchar,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"profile_slug" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_exhibitors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"stall" varchar,
  	"about" varchar,
  	"profile_slug" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_webinar_learn" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_webinar_replay_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" varchar,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_webinar_replay_qa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_live_announcements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar,
  	"company" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v_version_live_updates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"kind" "cms"."enum_submissions_kind" NOT NULL,
  	"status" "cms"."enum_submissions_status" DEFAULT 'Under review' NOT NULL,
  	"title" varchar NOT NULL,
  	"details" jsonb NOT NULL,
  	"contact_name" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"submitted_by" varchar,
  	"organisation_id" varchar,
  	"review_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."submissions_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "cms"."events" ADD COLUMN "event_type" "cms"."enum_events_event_type" DEFAULT 'Conference and expo';
  ALTER TABLE "cms"."events" ADD COLUMN "attendance" "cms"."enum_events_attendance" DEFAULT 'In person';
  ALTER TABLE "cms"."events" ADD COLUMN "city" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "summary_line" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "listed_by" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "featured" boolean;
  ALTER TABLE "cms"."events" ADD COLUMN "exhibitor_count" numeric;
  ALTER TABLE "cms"."events" ADD COLUMN "host" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_capacity" numeric;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_closed" boolean;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_join_url" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_sponsor_name" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_sponsor_disclosure" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_sponsor_profile_slug" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_replay_url" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_replay_minutes" numeric;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_replay_slides_url" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "webinar_replay_slides_note" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "live_on" boolean;
  ALTER TABLE "cms"."events" ADD COLUMN "live_day_label" varchar;
  ALTER TABLE "cms"."events" ADD COLUMN "coverage_note" varchar;
  ALTER TABLE "cms"."events_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_event_type" "cms"."enum__events_v_version_event_type" DEFAULT 'Conference and expo';
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_attendance" "cms"."enum__events_v_version_attendance" DEFAULT 'In person';
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_city" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_summary_line" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_listed_by" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_featured" boolean;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_exhibitor_count" numeric;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_host" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_capacity" numeric;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_closed" boolean;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_join_url" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_sponsor_name" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_sponsor_disclosure" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_sponsor_profile_slug" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_replay_url" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_replay_minutes" numeric;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_replay_slides_url" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_webinar_replay_slides_note" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_live_on" boolean;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_live_day_label" varchar;
  ALTER TABLE "cms"."_events_v" ADD COLUMN "version_coverage_note" varchar;
  ALTER TABLE "cms"."_events_v_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "submissions_id" integer;
  ALTER TABLE "cms"."events_agenda" ADD CONSTRAINT "events_agenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_speakers" ADD CONSTRAINT "events_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_exhibitors" ADD CONSTRAINT "events_exhibitors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_webinar_learn" ADD CONSTRAINT "events_webinar_learn_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_webinar_replay_chapters" ADD CONSTRAINT "events_webinar_replay_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_webinar_replay_qa" ADD CONSTRAINT "events_webinar_replay_qa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_live_announcements" ADD CONSTRAINT "events_live_announcements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_live_updates" ADD CONSTRAINT "events_live_updates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_agenda" ADD CONSTRAINT "_events_v_version_agenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_speakers" ADD CONSTRAINT "_events_v_version_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_exhibitors" ADD CONSTRAINT "_events_v_version_exhibitors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_webinar_learn" ADD CONSTRAINT "_events_v_version_webinar_learn_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_webinar_replay_chapters" ADD CONSTRAINT "_events_v_version_webinar_replay_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_webinar_replay_qa" ADD CONSTRAINT "_events_v_version_webinar_replay_qa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_live_announcements" ADD CONSTRAINT "_events_v_version_live_announcements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_live_updates" ADD CONSTRAINT "_events_v_version_live_updates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."submissions_texts" ADD CONSTRAINT "submissions_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_agenda_order_idx" ON "cms"."events_agenda" USING btree ("_order");
  CREATE INDEX "events_agenda_parent_id_idx" ON "cms"."events_agenda" USING btree ("_parent_id");
  CREATE INDEX "events_speakers_order_idx" ON "cms"."events_speakers" USING btree ("_order");
  CREATE INDEX "events_speakers_parent_id_idx" ON "cms"."events_speakers" USING btree ("_parent_id");
  CREATE INDEX "events_exhibitors_order_idx" ON "cms"."events_exhibitors" USING btree ("_order");
  CREATE INDEX "events_exhibitors_parent_id_idx" ON "cms"."events_exhibitors" USING btree ("_parent_id");
  CREATE INDEX "events_webinar_learn_order_idx" ON "cms"."events_webinar_learn" USING btree ("_order");
  CREATE INDEX "events_webinar_learn_parent_id_idx" ON "cms"."events_webinar_learn" USING btree ("_parent_id");
  CREATE INDEX "events_webinar_replay_chapters_order_idx" ON "cms"."events_webinar_replay_chapters" USING btree ("_order");
  CREATE INDEX "events_webinar_replay_chapters_parent_id_idx" ON "cms"."events_webinar_replay_chapters" USING btree ("_parent_id");
  CREATE INDEX "events_webinar_replay_qa_order_idx" ON "cms"."events_webinar_replay_qa" USING btree ("_order");
  CREATE INDEX "events_webinar_replay_qa_parent_id_idx" ON "cms"."events_webinar_replay_qa" USING btree ("_parent_id");
  CREATE INDEX "events_live_announcements_order_idx" ON "cms"."events_live_announcements" USING btree ("_order");
  CREATE INDEX "events_live_announcements_parent_id_idx" ON "cms"."events_live_announcements" USING btree ("_parent_id");
  CREATE INDEX "events_live_updates_order_idx" ON "cms"."events_live_updates" USING btree ("_order");
  CREATE INDEX "events_live_updates_parent_id_idx" ON "cms"."events_live_updates" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_agenda_order_idx" ON "cms"."_events_v_version_agenda" USING btree ("_order");
  CREATE INDEX "_events_v_version_agenda_parent_id_idx" ON "cms"."_events_v_version_agenda" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_speakers_order_idx" ON "cms"."_events_v_version_speakers" USING btree ("_order");
  CREATE INDEX "_events_v_version_speakers_parent_id_idx" ON "cms"."_events_v_version_speakers" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_exhibitors_order_idx" ON "cms"."_events_v_version_exhibitors" USING btree ("_order");
  CREATE INDEX "_events_v_version_exhibitors_parent_id_idx" ON "cms"."_events_v_version_exhibitors" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_webinar_learn_order_idx" ON "cms"."_events_v_version_webinar_learn" USING btree ("_order");
  CREATE INDEX "_events_v_version_webinar_learn_parent_id_idx" ON "cms"."_events_v_version_webinar_learn" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_webinar_replay_chapters_order_idx" ON "cms"."_events_v_version_webinar_replay_chapters" USING btree ("_order");
  CREATE INDEX "_events_v_version_webinar_replay_chapters_parent_id_idx" ON "cms"."_events_v_version_webinar_replay_chapters" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_webinar_replay_qa_order_idx" ON "cms"."_events_v_version_webinar_replay_qa" USING btree ("_order");
  CREATE INDEX "_events_v_version_webinar_replay_qa_parent_id_idx" ON "cms"."_events_v_version_webinar_replay_qa" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_live_announcements_order_idx" ON "cms"."_events_v_version_live_announcements" USING btree ("_order");
  CREATE INDEX "_events_v_version_live_announcements_parent_id_idx" ON "cms"."_events_v_version_live_announcements" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_live_updates_order_idx" ON "cms"."_events_v_version_live_updates" USING btree ("_order");
  CREATE INDEX "_events_v_version_live_updates_parent_id_idx" ON "cms"."_events_v_version_live_updates" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "submissions_reference_idx" ON "cms"."submissions" USING btree ("reference");
  CREATE INDEX "submissions_kind_idx" ON "cms"."submissions" USING btree ("kind");
  CREATE INDEX "submissions_status_idx" ON "cms"."submissions" USING btree ("status");
  CREATE INDEX "submissions_updated_at_idx" ON "cms"."submissions" USING btree ("updated_at");
  CREATE INDEX "submissions_created_at_idx" ON "cms"."submissions" USING btree ("created_at");
  CREATE INDEX "submissions_texts_order_parent" ON "cms"."submissions_texts" USING btree ("order","parent_id");
  ALTER TABLE "cms"."events_rels" ADD CONSTRAINT "events_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_rels" ADD CONSTRAINT "_events_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("submissions_id") REFERENCES "cms"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_rels_articles_id_idx" ON "cms"."events_rels" USING btree ("articles_id");
  CREATE INDEX "_events_v_rels_articles_id_idx" ON "cms"."_events_v_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_submissions_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."events_agenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_exhibitors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_webinar_learn" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_webinar_replay_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_webinar_replay_qa" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_live_announcements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_live_updates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_agenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_exhibitors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_webinar_learn" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_webinar_replay_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_webinar_replay_qa" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_live_announcements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_live_updates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."submissions_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."events_agenda" CASCADE;
  DROP TABLE "cms"."events_speakers" CASCADE;
  DROP TABLE "cms"."events_exhibitors" CASCADE;
  DROP TABLE "cms"."events_webinar_learn" CASCADE;
  DROP TABLE "cms"."events_webinar_replay_chapters" CASCADE;
  DROP TABLE "cms"."events_webinar_replay_qa" CASCADE;
  DROP TABLE "cms"."events_live_announcements" CASCADE;
  DROP TABLE "cms"."events_live_updates" CASCADE;
  DROP TABLE "cms"."_events_v_version_agenda" CASCADE;
  DROP TABLE "cms"."_events_v_version_speakers" CASCADE;
  DROP TABLE "cms"."_events_v_version_exhibitors" CASCADE;
  DROP TABLE "cms"."_events_v_version_webinar_learn" CASCADE;
  DROP TABLE "cms"."_events_v_version_webinar_replay_chapters" CASCADE;
  DROP TABLE "cms"."_events_v_version_webinar_replay_qa" CASCADE;
  DROP TABLE "cms"."_events_v_version_live_announcements" CASCADE;
  DROP TABLE "cms"."_events_v_version_live_updates" CASCADE;
  DROP TABLE "cms"."submissions" CASCADE;
  DROP TABLE "cms"."submissions_texts" CASCADE;
  ALTER TABLE "cms"."events_rels" DROP CONSTRAINT "events_rels_articles_fk";
  
  ALTER TABLE "cms"."_events_v_rels" DROP CONSTRAINT "_events_v_rels_articles_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_submissions_fk";
  
  DROP INDEX "cms"."events_rels_articles_id_idx";
  DROP INDEX "cms"."_events_v_rels_articles_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_submissions_id_idx";
  ALTER TABLE "cms"."events" DROP COLUMN "event_type";
  ALTER TABLE "cms"."events" DROP COLUMN "attendance";
  ALTER TABLE "cms"."events" DROP COLUMN "city";
  ALTER TABLE "cms"."events" DROP COLUMN "summary_line";
  ALTER TABLE "cms"."events" DROP COLUMN "listed_by";
  ALTER TABLE "cms"."events" DROP COLUMN "featured";
  ALTER TABLE "cms"."events" DROP COLUMN "exhibitor_count";
  ALTER TABLE "cms"."events" DROP COLUMN "host";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_capacity";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_closed";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_join_url";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_sponsor_name";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_sponsor_disclosure";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_sponsor_profile_slug";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_replay_url";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_replay_minutes";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_replay_slides_url";
  ALTER TABLE "cms"."events" DROP COLUMN "webinar_replay_slides_note";
  ALTER TABLE "cms"."events" DROP COLUMN "live_on";
  ALTER TABLE "cms"."events" DROP COLUMN "live_day_label";
  ALTER TABLE "cms"."events" DROP COLUMN "coverage_note";
  ALTER TABLE "cms"."events_rels" DROP COLUMN "articles_id";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_event_type";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_attendance";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_city";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_summary_line";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_listed_by";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_featured";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_exhibitor_count";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_host";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_capacity";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_closed";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_join_url";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_sponsor_name";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_sponsor_disclosure";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_sponsor_profile_slug";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_replay_url";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_replay_minutes";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_replay_slides_url";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_webinar_replay_slides_note";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_live_on";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_live_day_label";
  ALTER TABLE "cms"."_events_v" DROP COLUMN "version_coverage_note";
  ALTER TABLE "cms"."_events_v_rels" DROP COLUMN "articles_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "submissions_id";
  DROP TYPE "cms"."enum_events_event_type";
  DROP TYPE "cms"."enum_events_attendance";
  DROP TYPE "cms"."enum__events_v_version_event_type";
  DROP TYPE "cms"."enum__events_v_version_attendance";
  DROP TYPE "cms"."enum_submissions_kind";
  DROP TYPE "cms"."enum_submissions_status";`)
}
