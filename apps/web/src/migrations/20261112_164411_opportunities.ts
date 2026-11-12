import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_tenders_issuer_type" AS ENUM('SECI', 'Public sector companies', 'State agencies', 'Ports', 'Private');
  CREATE TYPE "cms"."enum_tenders_sector" AS ENUM('Production', 'Ammonia and methanol', 'Electrolysers', 'Refuelling stations', 'EPC', 'Equipment', 'Services');
  CREATE TYPE "cms"."enum_tenders_value_band" AS ENUM('Under ₹10 crore', '₹10–100 crore', 'Over ₹100 crore');
  CREATE TYPE "cms"."enum__tenders_v_version_issuer_type" AS ENUM('SECI', 'Public sector companies', 'State agencies', 'Ports', 'Private');
  CREATE TYPE "cms"."enum__tenders_v_version_sector" AS ENUM('Production', 'Ammonia and methanol', 'Electrolysers', 'Refuelling stations', 'EPC', 'Equipment', 'Services');
  CREATE TYPE "cms"."enum__tenders_v_version_value_band" AS ENUM('Under ₹10 crore', '₹10–100 crore', 'Over ₹100 crore');
  CREATE TYPE "cms"."enum_jobs_function" AS ENUM('Engineering', 'Operations and maintenance', 'Safety', 'Research', 'Policy and regulation', 'Sales and business development');
  CREATE TYPE "cms"."enum_jobs_job_type" AS ENUM('Full-time', 'Part-time', 'Contract', 'Internship');
  CREATE TYPE "cms"."enum_jobs_post_state" AS ENUM('Draft', 'Submitted for review');
  CREATE TYPE "cms"."enum__jobs_v_version_function" AS ENUM('Engineering', 'Operations and maintenance', 'Safety', 'Research', 'Policy and regulation', 'Sales and business development');
  CREATE TYPE "cms"."enum__jobs_v_version_job_type" AS ENUM('Full-time', 'Part-time', 'Contract', 'Internship');
  CREATE TYPE "cms"."enum__jobs_v_version_post_state" AS ENUM('Draft', 'Submitted for review');
  ALTER TYPE "cms"."enum_grants_status_override" ADD VALUE 'Announced' BEFORE 'Closed';
  ALTER TYPE "cms"."enum__grants_v_version_status_override" ADD VALUE 'Announced' BEFORE 'Closed';
  CREATE TABLE "cms"."grants_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step" varchar,
  	"at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."grants_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_grants_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"step" varchar,
  	"at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_grants_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."jobs_duties" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "cms"."jobs_needs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "cms"."_jobs_v_version_duties" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_jobs_v_version_needs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  -- Step 5.5 redraws the grant themes, who can apply, job experience and job function options. There were no grants
  -- or jobs before this step (sample content only arrives with it), so the old option values have nothing to convert.
  ALTER TABLE "cms"."grants_themes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum_grants_themes";
  CREATE TYPE "cms"."enum_grants_themes" AS ENUM('Production', 'Storage and transport', 'Fuel cells', 'Materials and catalysts', 'Safety and testing', 'Applications');
  ALTER TABLE "cms"."grants_themes" ALTER COLUMN "value" SET DATA TYPE "cms"."enum_grants_themes" USING "value"::"cms"."enum_grants_themes";
  ALTER TABLE "cms"."grants_who_can_apply" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum_grants_who_can_apply";
  CREATE TYPE "cms"."enum_grants_who_can_apply" AS ENUM('Researchers', 'Institutions', 'Start-ups', 'Companies', 'Consortia');
  ALTER TABLE "cms"."grants_who_can_apply" ALTER COLUMN "value" SET DATA TYPE "cms"."enum_grants_who_can_apply" USING "value"::"cms"."enum_grants_who_can_apply";
  ALTER TABLE "cms"."_grants_v_version_themes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum__grants_v_version_themes";
  CREATE TYPE "cms"."enum__grants_v_version_themes" AS ENUM('Production', 'Storage and transport', 'Fuel cells', 'Materials and catalysts', 'Safety and testing', 'Applications');
  ALTER TABLE "cms"."_grants_v_version_themes" ALTER COLUMN "value" SET DATA TYPE "cms"."enum__grants_v_version_themes" USING "value"::"cms"."enum__grants_v_version_themes";
  ALTER TABLE "cms"."_grants_v_version_who_can_apply" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum__grants_v_version_who_can_apply";
  CREATE TYPE "cms"."enum__grants_v_version_who_can_apply" AS ENUM('Researchers', 'Institutions', 'Start-ups', 'Companies', 'Consortia');
  ALTER TABLE "cms"."_grants_v_version_who_can_apply" ALTER COLUMN "value" SET DATA TYPE "cms"."enum__grants_v_version_who_can_apply" USING "value"::"cms"."enum__grants_v_version_who_can_apply";
  ALTER TABLE "cms"."jobs" ALTER COLUMN "experience" SET DATA TYPE text;
  DROP TYPE "cms"."enum_jobs_experience";
  CREATE TYPE "cms"."enum_jobs_experience" AS ENUM('Students', '0–2 years', '2–4 years', '3–6 years', '4–8 years', '5–8 years', '6–10 years', '10+ years');
  ALTER TABLE "cms"."jobs" ALTER COLUMN "experience" SET DATA TYPE "cms"."enum_jobs_experience" USING "experience"::"cms"."enum_jobs_experience";
  ALTER TABLE "cms"."_jobs_v" ALTER COLUMN "version_experience" SET DATA TYPE text;
  DROP TYPE "cms"."enum__jobs_v_version_experience";
  CREATE TYPE "cms"."enum__jobs_v_version_experience" AS ENUM('Students', '0–2 years', '2–4 years', '3–6 years', '4–8 years', '5–8 years', '6–10 years', '10+ years');
  ALTER TABLE "cms"."_jobs_v" ALTER COLUMN "version_experience" SET DATA TYPE "cms"."enum__jobs_v_version_experience" USING "version_experience"::"cms"."enum__jobs_v_version_experience";
  ALTER TABLE "cms"."jobs" ALTER COLUMN "function" SET DATA TYPE "cms"."enum_jobs_function" USING "function"::"cms"."enum_jobs_function";
  ALTER TABLE "cms"."_jobs_v" ALTER COLUMN "version_function" SET DATA TYPE "cms"."enum__jobs_v_version_function" USING "version_function"::"cms"."enum__jobs_v_version_function";
  ALTER TABLE "cms"."tenders_key_dates" ADD COLUMN "note" varchar;
  ALTER TABLE "cms"."tenders_result_winners" ADD COLUMN "place" varchar;
  ALTER TABLE "cms"."tenders_result_winners" ADD COLUMN "about" varchar;
  ALTER TABLE "cms"."tenders_result_winners" ADD COLUMN "profile_slug" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "issuer_name" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "issuer_type" "cms"."enum_tenders_issuer_type";
  ALTER TABLE "cms"."tenders" ADD COLUMN "sector" "cms"."enum_tenders_sector";
  ALTER TABLE "cms"."tenders" ADD COLUMN "value_band" "cms"."enum_tenders_value_band";
  ALTER TABLE "cms"."tenders" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."tenders" ADD COLUMN "extended_from" timestamp(3) with time zone;
  ALTER TABLE "cms"."tenders" ADD COLUMN "who_can_bid" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "result_date_label" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "result_winners_line" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "result_capacity_line" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "result_price" varchar;
  ALTER TABLE "cms"."tenders" ADD COLUMN "result_analysis_id" integer;
  ALTER TABLE "cms"."tenders" ADD COLUMN "result_source" varchar;
  ALTER TABLE "cms"."_tenders_v_version_key_dates" ADD COLUMN "note" varchar;
  ALTER TABLE "cms"."_tenders_v_version_result_winners" ADD COLUMN "place" varchar;
  ALTER TABLE "cms"."_tenders_v_version_result_winners" ADD COLUMN "about" varchar;
  ALTER TABLE "cms"."_tenders_v_version_result_winners" ADD COLUMN "profile_slug" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_issuer_name" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_issuer_type" "cms"."enum__tenders_v_version_issuer_type";
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_sector" "cms"."enum__tenders_v_version_sector";
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_value_band" "cms"."enum__tenders_v_version_value_band";
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_published_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_extended_from" timestamp(3) with time zone;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_who_can_bid" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_result_date_label" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_result_winners_line" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_result_capacity_line" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_result_price" varchar;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_result_analysis_id" integer;
  ALTER TABLE "cms"."_tenders_v" ADD COLUMN "version_result_source" varchar;
  ALTER TABLE "cms"."grants_past_awardees" ADD COLUMN "amount" varchar;
  ALTER TABLE "cms"."grants" ADD COLUMN "funder_name" varchar;
  ALTER TABLE "cms"."grants" ADD COLUMN "summary" varchar;
  ALTER TABLE "cms"."grants" ADD COLUMN "who_text" varchar;
  ALTER TABLE "cms"."grants" ADD COLUMN "focus_note" varchar;
  ALTER TABLE "cms"."grants" ADD COLUMN "past_call_label" varchar;
  ALTER TABLE "cms"."grants" ADD COLUMN "past_call_url" varchar;
  ALTER TABLE "cms"."_grants_v_version_past_awardees" ADD COLUMN "amount" varchar;
  ALTER TABLE "cms"."_grants_v" ADD COLUMN "version_funder_name" varchar;
  ALTER TABLE "cms"."_grants_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "cms"."_grants_v" ADD COLUMN "version_who_text" varchar;
  ALTER TABLE "cms"."_grants_v" ADD COLUMN "version_focus_note" varchar;
  ALTER TABLE "cms"."_grants_v" ADD COLUMN "version_past_call_label" varchar;
  ALTER TABLE "cms"."_grants_v" ADD COLUMN "version_past_call_url" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "job_type" "cms"."enum_jobs_job_type" DEFAULT 'Full-time';
  ALTER TABLE "cms"."jobs" ADD COLUMN "company_slug" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "company_line" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "location_note" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "post_state" "cms"."enum_jobs_post_state";
  ALTER TABLE "cms"."jobs" ADD COLUMN "post_reference" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "post_organisation_id" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "post_submitted_by" varchar;
  ALTER TABLE "cms"."jobs" ADD COLUMN "post_submitted_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_job_type" "cms"."enum__jobs_v_version_job_type" DEFAULT 'Full-time';
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_company_slug" varchar;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_company_line" varchar;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_location_note" varchar;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_post_state" "cms"."enum__jobs_v_version_post_state";
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_post_reference" varchar;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_post_organisation_id" varchar;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_post_submitted_by" varchar;
  ALTER TABLE "cms"."_jobs_v" ADD COLUMN "version_post_submitted_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."grants_steps" ADD CONSTRAINT "grants_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_texts" ADD CONSTRAINT "grants_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_version_steps" ADD CONSTRAINT "_grants_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_texts" ADD CONSTRAINT "_grants_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs_duties" ADD CONSTRAINT "jobs_duties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs_needs" ADD CONSTRAINT "jobs_needs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_version_duties" ADD CONSTRAINT "_jobs_v_version_duties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_version_needs" ADD CONSTRAINT "_jobs_v_version_needs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "grants_steps_order_idx" ON "cms"."grants_steps" USING btree ("_order");
  CREATE INDEX "grants_steps_parent_id_idx" ON "cms"."grants_steps" USING btree ("_parent_id");
  CREATE INDEX "grants_texts_order_parent" ON "cms"."grants_texts" USING btree ("order","parent_id");
  CREATE INDEX "_grants_v_version_steps_order_idx" ON "cms"."_grants_v_version_steps" USING btree ("_order");
  CREATE INDEX "_grants_v_version_steps_parent_id_idx" ON "cms"."_grants_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_grants_v_texts_order_parent" ON "cms"."_grants_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "jobs_duties_order_idx" ON "cms"."jobs_duties" USING btree ("_order");
  CREATE INDEX "jobs_duties_parent_id_idx" ON "cms"."jobs_duties" USING btree ("_parent_id");
  CREATE INDEX "jobs_needs_order_idx" ON "cms"."jobs_needs" USING btree ("_order");
  CREATE INDEX "jobs_needs_parent_id_idx" ON "cms"."jobs_needs" USING btree ("_parent_id");
  CREATE INDEX "_jobs_v_version_duties_order_idx" ON "cms"."_jobs_v_version_duties" USING btree ("_order");
  CREATE INDEX "_jobs_v_version_duties_parent_id_idx" ON "cms"."_jobs_v_version_duties" USING btree ("_parent_id");
  CREATE INDEX "_jobs_v_version_needs_order_idx" ON "cms"."_jobs_v_version_needs" USING btree ("_order");
  CREATE INDEX "_jobs_v_version_needs_parent_id_idx" ON "cms"."_jobs_v_version_needs" USING btree ("_parent_id");
  ALTER TABLE "cms"."tenders" ADD CONSTRAINT "tenders_result_analysis_id_articles_id_fk" FOREIGN KEY ("result_analysis_id") REFERENCES "cms"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v" ADD CONSTRAINT "_tenders_v_version_result_analysis_id_articles_id_fk" FOREIGN KEY ("version_result_analysis_id") REFERENCES "cms"."articles"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "tenders_published_at_idx" ON "cms"."tenders" USING btree ("published_at");
  CREATE INDEX "tenders_extended_from_idx" ON "cms"."tenders" USING btree ("extended_from");
  CREATE INDEX "tenders_result_result_analysis_idx" ON "cms"."tenders" USING btree ("result_analysis_id");
  CREATE INDEX "_tenders_v_version_version_published_at_idx" ON "cms"."_tenders_v" USING btree ("version_published_at");
  CREATE INDEX "_tenders_v_version_version_extended_from_idx" ON "cms"."_tenders_v" USING btree ("version_extended_from");
  CREATE INDEX "_tenders_v_version_result_version_result_analysis_idx" ON "cms"."_tenders_v" USING btree ("version_result_analysis_id");
  CREATE INDEX "jobs_post_post_reference_idx" ON "cms"."jobs" USING btree ("post_reference");
  CREATE INDEX "jobs_post_post_organisation_id_idx" ON "cms"."jobs" USING btree ("post_organisation_id");
  CREATE INDEX "_jobs_v_version_post_version_post_reference_idx" ON "cms"."_jobs_v" USING btree ("version_post_reference");
  CREATE INDEX "_jobs_v_version_post_version_post_organisation_id_idx" ON "cms"."_jobs_v" USING btree ("version_post_organisation_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."grants_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_version_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs_duties" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs_needs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v_version_duties" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v_version_needs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."grants_steps" CASCADE;
  DROP TABLE "cms"."grants_texts" CASCADE;
  DROP TABLE "cms"."_grants_v_version_steps" CASCADE;
  DROP TABLE "cms"."_grants_v_texts" CASCADE;
  DROP TABLE "cms"."jobs_duties" CASCADE;
  DROP TABLE "cms"."jobs_needs" CASCADE;
  DROP TABLE "cms"."_jobs_v_version_duties" CASCADE;
  DROP TABLE "cms"."_jobs_v_version_needs" CASCADE;
  ALTER TABLE "cms"."tenders" DROP CONSTRAINT "tenders_result_analysis_id_articles_id_fk";
  
  ALTER TABLE "cms"."_tenders_v" DROP CONSTRAINT "_tenders_v_version_result_analysis_id_articles_id_fk";
  
  ALTER TABLE "cms"."grants_themes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum_grants_themes";
  CREATE TYPE "cms"."enum_grants_themes" AS ENUM('Electrolysers', 'Storage', 'Fuel cells', 'Safety and standards', 'Materials', 'Transport', 'Industry');
  ALTER TABLE "cms"."grants_themes" ALTER COLUMN "value" SET DATA TYPE "cms"."enum_grants_themes" USING "value"::"cms"."enum_grants_themes";
  ALTER TABLE "cms"."grants_who_can_apply" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum_grants_who_can_apply";
  CREATE TYPE "cms"."enum_grants_who_can_apply" AS ENUM('Green hydrogen producers', 'Electrolyser manufacturers', 'Project developers', 'Research institutions', 'Start-ups', 'Manufacturers', 'State agencies');
  ALTER TABLE "cms"."grants_who_can_apply" ALTER COLUMN "value" SET DATA TYPE "cms"."enum_grants_who_can_apply" USING "value"::"cms"."enum_grants_who_can_apply";
  ALTER TABLE "cms"."grants" ALTER COLUMN "status_override" SET DATA TYPE text;
  DROP TYPE "cms"."enum_grants_status_override";
  CREATE TYPE "cms"."enum_grants_status_override" AS ENUM('Closed');
  ALTER TABLE "cms"."grants" ALTER COLUMN "status_override" SET DATA TYPE "cms"."enum_grants_status_override" USING "status_override"::"cms"."enum_grants_status_override";
  ALTER TABLE "cms"."_grants_v_version_themes" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum__grants_v_version_themes";
  CREATE TYPE "cms"."enum__grants_v_version_themes" AS ENUM('Electrolysers', 'Storage', 'Fuel cells', 'Safety and standards', 'Materials', 'Transport', 'Industry');
  ALTER TABLE "cms"."_grants_v_version_themes" ALTER COLUMN "value" SET DATA TYPE "cms"."enum__grants_v_version_themes" USING "value"::"cms"."enum__grants_v_version_themes";
  ALTER TABLE "cms"."_grants_v_version_who_can_apply" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "cms"."enum__grants_v_version_who_can_apply";
  CREATE TYPE "cms"."enum__grants_v_version_who_can_apply" AS ENUM('Green hydrogen producers', 'Electrolyser manufacturers', 'Project developers', 'Research institutions', 'Start-ups', 'Manufacturers', 'State agencies');
  ALTER TABLE "cms"."_grants_v_version_who_can_apply" ALTER COLUMN "value" SET DATA TYPE "cms"."enum__grants_v_version_who_can_apply" USING "value"::"cms"."enum__grants_v_version_who_can_apply";
  ALTER TABLE "cms"."_grants_v" ALTER COLUMN "version_status_override" SET DATA TYPE text;
  DROP TYPE "cms"."enum__grants_v_version_status_override";
  CREATE TYPE "cms"."enum__grants_v_version_status_override" AS ENUM('Closed');
  ALTER TABLE "cms"."_grants_v" ALTER COLUMN "version_status_override" SET DATA TYPE "cms"."enum__grants_v_version_status_override" USING "version_status_override"::"cms"."enum__grants_v_version_status_override";
  ALTER TABLE "cms"."jobs" ALTER COLUMN "experience" SET DATA TYPE text;
  DROP TYPE "cms"."enum_jobs_experience";
  CREATE TYPE "cms"."enum_jobs_experience" AS ENUM('0–2 years', '3–6 years', '7–10 years', '10+ years');
  ALTER TABLE "cms"."jobs" ALTER COLUMN "experience" SET DATA TYPE "cms"."enum_jobs_experience" USING "experience"::"cms"."enum_jobs_experience";
  ALTER TABLE "cms"."_jobs_v" ALTER COLUMN "version_experience" SET DATA TYPE text;
  DROP TYPE "cms"."enum__jobs_v_version_experience";
  CREATE TYPE "cms"."enum__jobs_v_version_experience" AS ENUM('0–2 years', '3–6 years', '7–10 years', '10+ years');
  ALTER TABLE "cms"."_jobs_v" ALTER COLUMN "version_experience" SET DATA TYPE "cms"."enum__jobs_v_version_experience" USING "version_experience"::"cms"."enum__jobs_v_version_experience";
  DROP INDEX "cms"."tenders_published_at_idx";
  DROP INDEX "cms"."tenders_extended_from_idx";
  DROP INDEX "cms"."tenders_result_result_analysis_idx";
  DROP INDEX "cms"."_tenders_v_version_version_published_at_idx";
  DROP INDEX "cms"."_tenders_v_version_version_extended_from_idx";
  DROP INDEX "cms"."_tenders_v_version_result_version_result_analysis_idx";
  DROP INDEX "cms"."jobs_post_post_reference_idx";
  DROP INDEX "cms"."jobs_post_post_organisation_id_idx";
  DROP INDEX "cms"."_jobs_v_version_post_version_post_reference_idx";
  DROP INDEX "cms"."_jobs_v_version_post_version_post_organisation_id_idx";
  ALTER TABLE "cms"."jobs" ALTER COLUMN "function" SET DATA TYPE varchar;
  ALTER TABLE "cms"."_jobs_v" ALTER COLUMN "version_function" SET DATA TYPE varchar;
  ALTER TABLE "cms"."tenders_key_dates" DROP COLUMN "note";
  ALTER TABLE "cms"."tenders_result_winners" DROP COLUMN "place";
  ALTER TABLE "cms"."tenders_result_winners" DROP COLUMN "about";
  ALTER TABLE "cms"."tenders_result_winners" DROP COLUMN "profile_slug";
  ALTER TABLE "cms"."tenders" DROP COLUMN "issuer_name";
  ALTER TABLE "cms"."tenders" DROP COLUMN "issuer_type";
  ALTER TABLE "cms"."tenders" DROP COLUMN "sector";
  ALTER TABLE "cms"."tenders" DROP COLUMN "value_band";
  ALTER TABLE "cms"."tenders" DROP COLUMN "published_at";
  ALTER TABLE "cms"."tenders" DROP COLUMN "extended_from";
  ALTER TABLE "cms"."tenders" DROP COLUMN "who_can_bid";
  ALTER TABLE "cms"."tenders" DROP COLUMN "result_date_label";
  ALTER TABLE "cms"."tenders" DROP COLUMN "result_winners_line";
  ALTER TABLE "cms"."tenders" DROP COLUMN "result_capacity_line";
  ALTER TABLE "cms"."tenders" DROP COLUMN "result_price";
  ALTER TABLE "cms"."tenders" DROP COLUMN "result_analysis_id";
  ALTER TABLE "cms"."tenders" DROP COLUMN "result_source";
  ALTER TABLE "cms"."_tenders_v_version_key_dates" DROP COLUMN "note";
  ALTER TABLE "cms"."_tenders_v_version_result_winners" DROP COLUMN "place";
  ALTER TABLE "cms"."_tenders_v_version_result_winners" DROP COLUMN "about";
  ALTER TABLE "cms"."_tenders_v_version_result_winners" DROP COLUMN "profile_slug";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_issuer_name";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_issuer_type";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_sector";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_value_band";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_published_at";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_extended_from";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_who_can_bid";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_result_date_label";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_result_winners_line";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_result_capacity_line";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_result_price";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_result_analysis_id";
  ALTER TABLE "cms"."_tenders_v" DROP COLUMN "version_result_source";
  ALTER TABLE "cms"."grants_past_awardees" DROP COLUMN "amount";
  ALTER TABLE "cms"."grants" DROP COLUMN "funder_name";
  ALTER TABLE "cms"."grants" DROP COLUMN "summary";
  ALTER TABLE "cms"."grants" DROP COLUMN "who_text";
  ALTER TABLE "cms"."grants" DROP COLUMN "focus_note";
  ALTER TABLE "cms"."grants" DROP COLUMN "past_call_label";
  ALTER TABLE "cms"."grants" DROP COLUMN "past_call_url";
  ALTER TABLE "cms"."_grants_v_version_past_awardees" DROP COLUMN "amount";
  ALTER TABLE "cms"."_grants_v" DROP COLUMN "version_funder_name";
  ALTER TABLE "cms"."_grants_v" DROP COLUMN "version_summary";
  ALTER TABLE "cms"."_grants_v" DROP COLUMN "version_who_text";
  ALTER TABLE "cms"."_grants_v" DROP COLUMN "version_focus_note";
  ALTER TABLE "cms"."_grants_v" DROP COLUMN "version_past_call_label";
  ALTER TABLE "cms"."_grants_v" DROP COLUMN "version_past_call_url";
  ALTER TABLE "cms"."jobs" DROP COLUMN "job_type";
  ALTER TABLE "cms"."jobs" DROP COLUMN "company_slug";
  ALTER TABLE "cms"."jobs" DROP COLUMN "company_line";
  ALTER TABLE "cms"."jobs" DROP COLUMN "location_note";
  ALTER TABLE "cms"."jobs" DROP COLUMN "post_state";
  ALTER TABLE "cms"."jobs" DROP COLUMN "post_reference";
  ALTER TABLE "cms"."jobs" DROP COLUMN "post_organisation_id";
  ALTER TABLE "cms"."jobs" DROP COLUMN "post_submitted_by";
  ALTER TABLE "cms"."jobs" DROP COLUMN "post_submitted_at";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_job_type";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_company_slug";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_company_line";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_location_note";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_post_state";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_post_reference";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_post_organisation_id";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_post_submitted_by";
  ALTER TABLE "cms"."_jobs_v" DROP COLUMN "version_post_submitted_at";
  DROP TYPE "cms"."enum_tenders_issuer_type";
  DROP TYPE "cms"."enum_tenders_sector";
  DROP TYPE "cms"."enum_tenders_value_band";
  DROP TYPE "cms"."enum__tenders_v_version_issuer_type";
  DROP TYPE "cms"."enum__tenders_v_version_sector";
  DROP TYPE "cms"."enum__tenders_v_version_value_band";
  DROP TYPE "cms"."enum_jobs_function";
  DROP TYPE "cms"."enum_jobs_job_type";
  DROP TYPE "cms"."enum_jobs_post_state";
  DROP TYPE "cms"."enum__jobs_v_version_function";
  DROP TYPE "cms"."enum__jobs_v_version_job_type";
  DROP TYPE "cms"."enum__jobs_v_version_post_state";`)
}
