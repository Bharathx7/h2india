import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_legal_pages_slug" AS ENUM('terms', 'privacy', 'cookies', 'editorial-policy', 'corrections', 'sponsored-content');
  CREATE TYPE "cms"."enum_legal_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__legal_pages_v_version_slug" AS ENUM('terms', 'privacy', 'cookies', 'editorial-policy', 'corrections', 'sponsored-content');
  CREATE TYPE "cms"."enum__legal_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_help_articles_category" AS ENUM('getting-started', 'buying', 'selling', 'payments', 'verification', 'alerts', 'account');
  CREATE TYPE "cms"."enum_help_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__help_articles_v_version_category" AS ENUM('getting-started', 'buying', 'selling', 'payments', 'verification', 'alerts', 'account');
  CREATE TYPE "cms"."enum__help_articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_team_members_group" AS ENUM('Management', 'Advisors');
  CREATE TYPE "cms"."enum_team_members_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__team_members_v_version_group" AS ENUM('Management', 'Advisors');
  CREATE TYPE "cms"."enum__team_members_v_version_status" AS ENUM('draft', 'published');
  ALTER TYPE "cms"."enum_submissions_kind" ADD VALUE 'contact';
  ALTER TYPE "cms"."enum_submissions_kind" ADD VALUE 'partnership';
  ALTER TYPE "cms"."enum_submissions_kind" ADD VALUE 'advertising';
  ALTER TYPE "cms"."enum_submissions_status" ADD VALUE 'Answered';
  CREATE TABLE "cms"."legal_pages_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "cms"."legal_pages_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"version" varchar,
  	"date" timestamp(3) with time zone,
  	"changed" varchar
  );
  
  CREATE TABLE "cms"."legal_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" "cms"."enum_legal_pages_slug",
  	"title" varchar,
  	"version" varchar,
  	"effective_on" timestamp(3) with time zone,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_legal_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_legal_pages_v_version_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_legal_pages_v_version_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"version" varchar,
  	"date" timestamp(3) with time zone,
  	"changed" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_legal_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" "cms"."enum__legal_pages_v_version_slug",
  	"version_title" varchar,
  	"version_version" varchar,
  	"version_effective_on" timestamp(3) with time zone,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__legal_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."help_articles_sections_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."help_articles_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."help_articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" "cms"."enum_help_articles_category",
  	"read_minutes" numeric DEFAULT 2,
  	"popular" numeric,
  	"featured" numeric,
  	"intro" varchar,
  	"callout_title" varchar,
  	"callout_text" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_help_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."help_articles_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."help_articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"help_articles_id" integer
  );
  
  CREATE TABLE "cms"."_help_articles_v_version_sections_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_help_articles_v_version_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_help_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" "cms"."enum__help_articles_v_version_category",
  	"version_read_minutes" numeric DEFAULT 2,
  	"version_popular" numeric,
  	"version_featured" numeric,
  	"version_intro" varchar,
  	"version_callout_title" varchar,
  	"version_callout_text" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__help_articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_help_articles_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_help_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"help_articles_id" integer
  );
  
  CREATE TABLE "cms"."team_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"group" "cms"."enum_team_members_group" DEFAULT 'Management',
  	"order" numeric DEFAULT 10,
  	"linkedin" varchar,
  	"founder" boolean,
  	"bio" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_team_members_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_team_members_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_role" varchar,
  	"version_group" "cms"."enum__team_members_v_version_group" DEFAULT 'Management',
  	"version_order" numeric DEFAULT 10,
  	"version_linkedin" varchar,
  	"version_founder" boolean,
  	"version_bio" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__team_members_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."trust_settings_about_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"as_of" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."trust_settings_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"as_of" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."trust_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"operating_company" varchar,
  	"gstin" varchar,
  	"registered_office" varchar,
  	"office_hours" varchar DEFAULT 'Monday to Friday, 9:30 am to 6:00 pm IST. Visits by appointment only.',
  	"disclosure" varchar,
  	"disclosure_date" timestamp(3) with time zone,
  	"grievance_officer_name" varchar,
  	"grievance_officer_designation" varchar DEFAULT 'Grievance Officer, H2 India',
  	"grievance_officer_email" varchar,
  	"partnerships_name" varchar,
  	"partnerships_role" varchar DEFAULT 'Head of Partnerships',
  	"boilerplate" varchar DEFAULT 'H2 India is India''s hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India''s hydrogen economy.',
  	"media_kit_url" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_trust_settings_v_version_about_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"as_of" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_trust_settings_v_version_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"as_of" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_trust_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_operating_company" varchar,
  	"version_gstin" varchar,
  	"version_registered_office" varchar,
  	"version_office_hours" varchar DEFAULT 'Monday to Friday, 9:30 am to 6:00 pm IST. Visits by appointment only.',
  	"version_disclosure" varchar,
  	"version_disclosure_date" timestamp(3) with time zone,
  	"version_grievance_officer_name" varchar,
  	"version_grievance_officer_designation" varchar DEFAULT 'Grievance Officer, H2 India',
  	"version_grievance_officer_email" varchar,
  	"version_partnerships_name" varchar,
  	"version_partnerships_role" varchar DEFAULT 'Head of Partnerships',
  	"version_boilerplate" varchar DEFAULT 'H2 India is India''s hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India''s hydrogen economy.',
  	"version_media_kit_url" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."pricing_plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pricing_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"price" varchar NOT NULL,
  	"period" varchar,
  	"summary" varchar NOT NULL,
  	"cta" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"highlight" boolean
  );
  
  CREATE TABLE "cms"."pricing_commission_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" varchar NOT NULL,
  	"commission" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pricing_add_ons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"price" varchar NOT NULL,
  	"unit" varchar,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pricing_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pricing" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rate_card_note" varchar,
  	"commission_launch_value" varchar,
  	"commission_launch_note" varchar,
  	"commission_after_value" varchar,
  	"commission_after_note" varchar,
  	"commission_after_detail" varchar,
  	"commission_footnote" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_pricing_v_version_plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pricing_v_version_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"price" varchar NOT NULL,
  	"period" varchar,
  	"summary" varchar NOT NULL,
  	"cta" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"highlight" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pricing_v_version_commission_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" varchar NOT NULL,
  	"commission" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pricing_v_version_add_ons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"price" varchar NOT NULL,
  	"unit" varchar,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pricing_v_version_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pricing_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_rate_card_note" varchar,
  	"version_commission_launch_value" varchar,
  	"version_commission_launch_note" varchar,
  	"version_commission_after_value" varchar,
  	"version_commission_after_note" varchar,
  	"version_commission_after_detail" varchar,
  	"version_commission_footnote" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."audience_faqs_buyers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."audience_faqs_suppliers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."audience_faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_audience_faqs_v_version_buyers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_audience_faqs_v_version_suppliers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_audience_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "legal_pages_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "help_articles_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "team_members_id" integer;
  ALTER TABLE "cms"."legal_pages_sections" ADD CONSTRAINT "legal_pages_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."legal_pages_history" ADD CONSTRAINT "legal_pages_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_legal_pages_v_version_sections" ADD CONSTRAINT "_legal_pages_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_legal_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_legal_pages_v_version_history" ADD CONSTRAINT "_legal_pages_v_version_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_legal_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_legal_pages_v" ADD CONSTRAINT "_legal_pages_v_parent_id_legal_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."legal_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."help_articles_sections_steps" ADD CONSTRAINT "help_articles_sections_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."help_articles_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."help_articles_sections" ADD CONSTRAINT "help_articles_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."help_articles_texts" ADD CONSTRAINT "help_articles_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."help_articles_rels" ADD CONSTRAINT "help_articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."help_articles_rels" ADD CONSTRAINT "help_articles_rels_help_articles_fk" FOREIGN KEY ("help_articles_id") REFERENCES "cms"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_help_articles_v_version_sections_steps" ADD CONSTRAINT "_help_articles_v_version_sections_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_help_articles_v_version_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_help_articles_v_version_sections" ADD CONSTRAINT "_help_articles_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_help_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_help_articles_v" ADD CONSTRAINT "_help_articles_v_parent_id_help_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."help_articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_help_articles_v_texts" ADD CONSTRAINT "_help_articles_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_help_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_help_articles_v_rels" ADD CONSTRAINT "_help_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_help_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_help_articles_v_rels" ADD CONSTRAINT "_help_articles_v_rels_help_articles_fk" FOREIGN KEY ("help_articles_id") REFERENCES "cms"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_team_members_v" ADD CONSTRAINT "_team_members_v_parent_id_team_members_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."team_members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."trust_settings_about_figures" ADD CONSTRAINT "trust_settings_about_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."trust_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."trust_settings_audience" ADD CONSTRAINT "trust_settings_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."trust_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_trust_settings_v_version_about_figures" ADD CONSTRAINT "_trust_settings_v_version_about_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_trust_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_trust_settings_v_version_audience" ADD CONSTRAINT "_trust_settings_v_version_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_trust_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pricing_plans_features" ADD CONSTRAINT "pricing_plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pricing_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pricing_plans" ADD CONSTRAINT "pricing_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pricing_commission_examples" ADD CONSTRAINT "pricing_commission_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pricing_add_ons" ADD CONSTRAINT "pricing_add_ons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pricing_faqs" ADD CONSTRAINT "pricing_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pricing_v_version_plans_features" ADD CONSTRAINT "_pricing_v_version_plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pricing_v_version_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pricing_v_version_plans" ADD CONSTRAINT "_pricing_v_version_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pricing_v_version_commission_examples" ADD CONSTRAINT "_pricing_v_version_commission_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pricing_v_version_add_ons" ADD CONSTRAINT "_pricing_v_version_add_ons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pricing_v_version_faqs" ADD CONSTRAINT "_pricing_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."audience_faqs_buyers" ADD CONSTRAINT "audience_faqs_buyers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."audience_faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."audience_faqs_suppliers" ADD CONSTRAINT "audience_faqs_suppliers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."audience_faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_audience_faqs_v_version_buyers" ADD CONSTRAINT "_audience_faqs_v_version_buyers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_audience_faqs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_audience_faqs_v_version_suppliers" ADD CONSTRAINT "_audience_faqs_v_version_suppliers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_audience_faqs_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "legal_pages_sections_order_idx" ON "cms"."legal_pages_sections" USING btree ("_order");
  CREATE INDEX "legal_pages_sections_parent_id_idx" ON "cms"."legal_pages_sections" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_history_order_idx" ON "cms"."legal_pages_history" USING btree ("_order");
  CREATE INDEX "legal_pages_history_parent_id_idx" ON "cms"."legal_pages_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "legal_pages_slug_idx" ON "cms"."legal_pages" USING btree ("slug");
  CREATE INDEX "legal_pages_updated_at_idx" ON "cms"."legal_pages" USING btree ("updated_at");
  CREATE INDEX "legal_pages_created_at_idx" ON "cms"."legal_pages" USING btree ("created_at");
  CREATE INDEX "legal_pages__status_idx" ON "cms"."legal_pages" USING btree ("_status");
  CREATE INDEX "_legal_pages_v_version_sections_order_idx" ON "cms"."_legal_pages_v_version_sections" USING btree ("_order");
  CREATE INDEX "_legal_pages_v_version_sections_parent_id_idx" ON "cms"."_legal_pages_v_version_sections" USING btree ("_parent_id");
  CREATE INDEX "_legal_pages_v_version_history_order_idx" ON "cms"."_legal_pages_v_version_history" USING btree ("_order");
  CREATE INDEX "_legal_pages_v_version_history_parent_id_idx" ON "cms"."_legal_pages_v_version_history" USING btree ("_parent_id");
  CREATE INDEX "_legal_pages_v_parent_idx" ON "cms"."_legal_pages_v" USING btree ("parent_id");
  CREATE INDEX "_legal_pages_v_version_version_slug_idx" ON "cms"."_legal_pages_v" USING btree ("version_slug");
  CREATE INDEX "_legal_pages_v_version_version_updated_at_idx" ON "cms"."_legal_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_legal_pages_v_version_version_created_at_idx" ON "cms"."_legal_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_legal_pages_v_version_version__status_idx" ON "cms"."_legal_pages_v" USING btree ("version__status");
  CREATE INDEX "_legal_pages_v_created_at_idx" ON "cms"."_legal_pages_v" USING btree ("created_at");
  CREATE INDEX "_legal_pages_v_updated_at_idx" ON "cms"."_legal_pages_v" USING btree ("updated_at");
  CREATE INDEX "_legal_pages_v_latest_idx" ON "cms"."_legal_pages_v" USING btree ("latest");
  CREATE INDEX "help_articles_sections_steps_order_idx" ON "cms"."help_articles_sections_steps" USING btree ("_order");
  CREATE INDEX "help_articles_sections_steps_parent_id_idx" ON "cms"."help_articles_sections_steps" USING btree ("_parent_id");
  CREATE INDEX "help_articles_sections_order_idx" ON "cms"."help_articles_sections" USING btree ("_order");
  CREATE INDEX "help_articles_sections_parent_id_idx" ON "cms"."help_articles_sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "help_articles_slug_idx" ON "cms"."help_articles" USING btree ("slug");
  CREATE INDEX "help_articles_category_idx" ON "cms"."help_articles" USING btree ("category");
  CREATE INDEX "help_articles_updated_at_idx" ON "cms"."help_articles" USING btree ("updated_at");
  CREATE INDEX "help_articles_created_at_idx" ON "cms"."help_articles" USING btree ("created_at");
  CREATE INDEX "help_articles__status_idx" ON "cms"."help_articles" USING btree ("_status");
  CREATE INDEX "help_articles_texts_order_parent" ON "cms"."help_articles_texts" USING btree ("order","parent_id");
  CREATE INDEX "help_articles_rels_order_idx" ON "cms"."help_articles_rels" USING btree ("order");
  CREATE INDEX "help_articles_rels_parent_idx" ON "cms"."help_articles_rels" USING btree ("parent_id");
  CREATE INDEX "help_articles_rels_path_idx" ON "cms"."help_articles_rels" USING btree ("path");
  CREATE INDEX "help_articles_rels_help_articles_id_idx" ON "cms"."help_articles_rels" USING btree ("help_articles_id");
  CREATE INDEX "_help_articles_v_version_sections_steps_order_idx" ON "cms"."_help_articles_v_version_sections_steps" USING btree ("_order");
  CREATE INDEX "_help_articles_v_version_sections_steps_parent_id_idx" ON "cms"."_help_articles_v_version_sections_steps" USING btree ("_parent_id");
  CREATE INDEX "_help_articles_v_version_sections_order_idx" ON "cms"."_help_articles_v_version_sections" USING btree ("_order");
  CREATE INDEX "_help_articles_v_version_sections_parent_id_idx" ON "cms"."_help_articles_v_version_sections" USING btree ("_parent_id");
  CREATE INDEX "_help_articles_v_parent_idx" ON "cms"."_help_articles_v" USING btree ("parent_id");
  CREATE INDEX "_help_articles_v_version_version_slug_idx" ON "cms"."_help_articles_v" USING btree ("version_slug");
  CREATE INDEX "_help_articles_v_version_version_category_idx" ON "cms"."_help_articles_v" USING btree ("version_category");
  CREATE INDEX "_help_articles_v_version_version_updated_at_idx" ON "cms"."_help_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_help_articles_v_version_version_created_at_idx" ON "cms"."_help_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_help_articles_v_version_version__status_idx" ON "cms"."_help_articles_v" USING btree ("version__status");
  CREATE INDEX "_help_articles_v_created_at_idx" ON "cms"."_help_articles_v" USING btree ("created_at");
  CREATE INDEX "_help_articles_v_updated_at_idx" ON "cms"."_help_articles_v" USING btree ("updated_at");
  CREATE INDEX "_help_articles_v_latest_idx" ON "cms"."_help_articles_v" USING btree ("latest");
  CREATE INDEX "_help_articles_v_texts_order_parent" ON "cms"."_help_articles_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_help_articles_v_rels_order_idx" ON "cms"."_help_articles_v_rels" USING btree ("order");
  CREATE INDEX "_help_articles_v_rels_parent_idx" ON "cms"."_help_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_help_articles_v_rels_path_idx" ON "cms"."_help_articles_v_rels" USING btree ("path");
  CREATE INDEX "_help_articles_v_rels_help_articles_id_idx" ON "cms"."_help_articles_v_rels" USING btree ("help_articles_id");
  CREATE INDEX "team_members_updated_at_idx" ON "cms"."team_members" USING btree ("updated_at");
  CREATE INDEX "team_members_created_at_idx" ON "cms"."team_members" USING btree ("created_at");
  CREATE INDEX "team_members__status_idx" ON "cms"."team_members" USING btree ("_status");
  CREATE INDEX "_team_members_v_parent_idx" ON "cms"."_team_members_v" USING btree ("parent_id");
  CREATE INDEX "_team_members_v_version_version_updated_at_idx" ON "cms"."_team_members_v" USING btree ("version_updated_at");
  CREATE INDEX "_team_members_v_version_version_created_at_idx" ON "cms"."_team_members_v" USING btree ("version_created_at");
  CREATE INDEX "_team_members_v_version_version__status_idx" ON "cms"."_team_members_v" USING btree ("version__status");
  CREATE INDEX "_team_members_v_created_at_idx" ON "cms"."_team_members_v" USING btree ("created_at");
  CREATE INDEX "_team_members_v_updated_at_idx" ON "cms"."_team_members_v" USING btree ("updated_at");
  CREATE INDEX "_team_members_v_latest_idx" ON "cms"."_team_members_v" USING btree ("latest");
  CREATE INDEX "trust_settings_about_figures_order_idx" ON "cms"."trust_settings_about_figures" USING btree ("_order");
  CREATE INDEX "trust_settings_about_figures_parent_id_idx" ON "cms"."trust_settings_about_figures" USING btree ("_parent_id");
  CREATE INDEX "trust_settings_audience_order_idx" ON "cms"."trust_settings_audience" USING btree ("_order");
  CREATE INDEX "trust_settings_audience_parent_id_idx" ON "cms"."trust_settings_audience" USING btree ("_parent_id");
  CREATE INDEX "_trust_settings_v_version_about_figures_order_idx" ON "cms"."_trust_settings_v_version_about_figures" USING btree ("_order");
  CREATE INDEX "_trust_settings_v_version_about_figures_parent_id_idx" ON "cms"."_trust_settings_v_version_about_figures" USING btree ("_parent_id");
  CREATE INDEX "_trust_settings_v_version_audience_order_idx" ON "cms"."_trust_settings_v_version_audience" USING btree ("_order");
  CREATE INDEX "_trust_settings_v_version_audience_parent_id_idx" ON "cms"."_trust_settings_v_version_audience" USING btree ("_parent_id");
  CREATE INDEX "_trust_settings_v_created_at_idx" ON "cms"."_trust_settings_v" USING btree ("created_at");
  CREATE INDEX "_trust_settings_v_updated_at_idx" ON "cms"."_trust_settings_v" USING btree ("updated_at");
  CREATE INDEX "pricing_plans_features_order_idx" ON "cms"."pricing_plans_features" USING btree ("_order");
  CREATE INDEX "pricing_plans_features_parent_id_idx" ON "cms"."pricing_plans_features" USING btree ("_parent_id");
  CREATE INDEX "pricing_plans_order_idx" ON "cms"."pricing_plans" USING btree ("_order");
  CREATE INDEX "pricing_plans_parent_id_idx" ON "cms"."pricing_plans" USING btree ("_parent_id");
  CREATE INDEX "pricing_commission_examples_order_idx" ON "cms"."pricing_commission_examples" USING btree ("_order");
  CREATE INDEX "pricing_commission_examples_parent_id_idx" ON "cms"."pricing_commission_examples" USING btree ("_parent_id");
  CREATE INDEX "pricing_add_ons_order_idx" ON "cms"."pricing_add_ons" USING btree ("_order");
  CREATE INDEX "pricing_add_ons_parent_id_idx" ON "cms"."pricing_add_ons" USING btree ("_parent_id");
  CREATE INDEX "pricing_faqs_order_idx" ON "cms"."pricing_faqs" USING btree ("_order");
  CREATE INDEX "pricing_faqs_parent_id_idx" ON "cms"."pricing_faqs" USING btree ("_parent_id");
  CREATE INDEX "_pricing_v_version_plans_features_order_idx" ON "cms"."_pricing_v_version_plans_features" USING btree ("_order");
  CREATE INDEX "_pricing_v_version_plans_features_parent_id_idx" ON "cms"."_pricing_v_version_plans_features" USING btree ("_parent_id");
  CREATE INDEX "_pricing_v_version_plans_order_idx" ON "cms"."_pricing_v_version_plans" USING btree ("_order");
  CREATE INDEX "_pricing_v_version_plans_parent_id_idx" ON "cms"."_pricing_v_version_plans" USING btree ("_parent_id");
  CREATE INDEX "_pricing_v_version_commission_examples_order_idx" ON "cms"."_pricing_v_version_commission_examples" USING btree ("_order");
  CREATE INDEX "_pricing_v_version_commission_examples_parent_id_idx" ON "cms"."_pricing_v_version_commission_examples" USING btree ("_parent_id");
  CREATE INDEX "_pricing_v_version_add_ons_order_idx" ON "cms"."_pricing_v_version_add_ons" USING btree ("_order");
  CREATE INDEX "_pricing_v_version_add_ons_parent_id_idx" ON "cms"."_pricing_v_version_add_ons" USING btree ("_parent_id");
  CREATE INDEX "_pricing_v_version_faqs_order_idx" ON "cms"."_pricing_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_pricing_v_version_faqs_parent_id_idx" ON "cms"."_pricing_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_pricing_v_created_at_idx" ON "cms"."_pricing_v" USING btree ("created_at");
  CREATE INDEX "_pricing_v_updated_at_idx" ON "cms"."_pricing_v" USING btree ("updated_at");
  CREATE INDEX "audience_faqs_buyers_order_idx" ON "cms"."audience_faqs_buyers" USING btree ("_order");
  CREATE INDEX "audience_faqs_buyers_parent_id_idx" ON "cms"."audience_faqs_buyers" USING btree ("_parent_id");
  CREATE INDEX "audience_faqs_suppliers_order_idx" ON "cms"."audience_faqs_suppliers" USING btree ("_order");
  CREATE INDEX "audience_faqs_suppliers_parent_id_idx" ON "cms"."audience_faqs_suppliers" USING btree ("_parent_id");
  CREATE INDEX "_audience_faqs_v_version_buyers_order_idx" ON "cms"."_audience_faqs_v_version_buyers" USING btree ("_order");
  CREATE INDEX "_audience_faqs_v_version_buyers_parent_id_idx" ON "cms"."_audience_faqs_v_version_buyers" USING btree ("_parent_id");
  CREATE INDEX "_audience_faqs_v_version_suppliers_order_idx" ON "cms"."_audience_faqs_v_version_suppliers" USING btree ("_order");
  CREATE INDEX "_audience_faqs_v_version_suppliers_parent_id_idx" ON "cms"."_audience_faqs_v_version_suppliers" USING btree ("_parent_id");
  CREATE INDEX "_audience_faqs_v_created_at_idx" ON "cms"."_audience_faqs_v" USING btree ("created_at");
  CREATE INDEX "_audience_faqs_v_updated_at_idx" ON "cms"."_audience_faqs_v" USING btree ("updated_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_pages_fk" FOREIGN KEY ("legal_pages_id") REFERENCES "cms"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_help_articles_fk" FOREIGN KEY ("help_articles_id") REFERENCES "cms"."help_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "cms"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_legal_pages_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("legal_pages_id");
  CREATE INDEX "payload_locked_documents_rels_help_articles_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("help_articles_id");
  CREATE INDEX "payload_locked_documents_rels_team_members_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("team_members_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."legal_pages_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."legal_pages_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."legal_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_legal_pages_v_version_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_legal_pages_v_version_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_legal_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."help_articles_sections_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."help_articles_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."help_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."help_articles_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."help_articles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_help_articles_v_version_sections_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_help_articles_v_version_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_help_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_help_articles_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_help_articles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."team_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_team_members_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."trust_settings_about_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."trust_settings_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."trust_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_trust_settings_v_version_about_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_trust_settings_v_version_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_trust_settings_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pricing_plans_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pricing_plans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pricing_commission_examples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pricing_add_ons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pricing_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pricing" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pricing_v_version_plans_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pricing_v_version_plans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pricing_v_version_commission_examples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pricing_v_version_add_ons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pricing_v_version_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pricing_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."audience_faqs_buyers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."audience_faqs_suppliers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."audience_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_audience_faqs_v_version_buyers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_audience_faqs_v_version_suppliers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_audience_faqs_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."legal_pages_sections" CASCADE;
  DROP TABLE "cms"."legal_pages_history" CASCADE;
  DROP TABLE "cms"."legal_pages" CASCADE;
  DROP TABLE "cms"."_legal_pages_v_version_sections" CASCADE;
  DROP TABLE "cms"."_legal_pages_v_version_history" CASCADE;
  DROP TABLE "cms"."_legal_pages_v" CASCADE;
  DROP TABLE "cms"."help_articles_sections_steps" CASCADE;
  DROP TABLE "cms"."help_articles_sections" CASCADE;
  DROP TABLE "cms"."help_articles" CASCADE;
  DROP TABLE "cms"."help_articles_texts" CASCADE;
  DROP TABLE "cms"."help_articles_rels" CASCADE;
  DROP TABLE "cms"."_help_articles_v_version_sections_steps" CASCADE;
  DROP TABLE "cms"."_help_articles_v_version_sections" CASCADE;
  DROP TABLE "cms"."_help_articles_v" CASCADE;
  DROP TABLE "cms"."_help_articles_v_texts" CASCADE;
  DROP TABLE "cms"."_help_articles_v_rels" CASCADE;
  DROP TABLE "cms"."team_members" CASCADE;
  DROP TABLE "cms"."_team_members_v" CASCADE;
  DROP TABLE "cms"."trust_settings_about_figures" CASCADE;
  DROP TABLE "cms"."trust_settings_audience" CASCADE;
  DROP TABLE "cms"."trust_settings" CASCADE;
  DROP TABLE "cms"."_trust_settings_v_version_about_figures" CASCADE;
  DROP TABLE "cms"."_trust_settings_v_version_audience" CASCADE;
  DROP TABLE "cms"."_trust_settings_v" CASCADE;
  DROP TABLE "cms"."pricing_plans_features" CASCADE;
  DROP TABLE "cms"."pricing_plans" CASCADE;
  DROP TABLE "cms"."pricing_commission_examples" CASCADE;
  DROP TABLE "cms"."pricing_add_ons" CASCADE;
  DROP TABLE "cms"."pricing_faqs" CASCADE;
  DROP TABLE "cms"."pricing" CASCADE;
  DROP TABLE "cms"."_pricing_v_version_plans_features" CASCADE;
  DROP TABLE "cms"."_pricing_v_version_plans" CASCADE;
  DROP TABLE "cms"."_pricing_v_version_commission_examples" CASCADE;
  DROP TABLE "cms"."_pricing_v_version_add_ons" CASCADE;
  DROP TABLE "cms"."_pricing_v_version_faqs" CASCADE;
  DROP TABLE "cms"."_pricing_v" CASCADE;
  DROP TABLE "cms"."audience_faqs_buyers" CASCADE;
  DROP TABLE "cms"."audience_faqs_suppliers" CASCADE;
  DROP TABLE "cms"."audience_faqs" CASCADE;
  DROP TABLE "cms"."_audience_faqs_v_version_buyers" CASCADE;
  DROP TABLE "cms"."_audience_faqs_v_version_suppliers" CASCADE;
  DROP TABLE "cms"."_audience_faqs_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_legal_pages_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_help_articles_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_team_members_fk";
  
  ALTER TABLE "cms"."submissions" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "cms"."enum_submissions_kind";
  CREATE TYPE "cms"."enum_submissions_kind" AS ENUM('event', 'press_release', 'correction', 'pitch');
  ALTER TABLE "cms"."submissions" ALTER COLUMN "kind" SET DATA TYPE "cms"."enum_submissions_kind" USING "kind"::"cms"."enum_submissions_kind";
  ALTER TABLE "cms"."submissions" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "cms"."submissions" ALTER COLUMN "status" SET DEFAULT 'Under review'::text;
  DROP TYPE "cms"."enum_submissions_status";
  CREATE TYPE "cms"."enum_submissions_status" AS ENUM('Under review', 'Published', 'Needs changes', 'Declined');
  ALTER TABLE "cms"."submissions" ALTER COLUMN "status" SET DEFAULT 'Under review'::"cms"."enum_submissions_status";
  ALTER TABLE "cms"."submissions" ALTER COLUMN "status" SET DATA TYPE "cms"."enum_submissions_status" USING "status"::"cms"."enum_submissions_status";
  DROP INDEX "cms"."payload_locked_documents_rels_legal_pages_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_help_articles_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_team_members_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "legal_pages_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "help_articles_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "team_members_id";
  DROP TYPE "cms"."enum_legal_pages_slug";
  DROP TYPE "cms"."enum_legal_pages_status";
  DROP TYPE "cms"."enum__legal_pages_v_version_slug";
  DROP TYPE "cms"."enum__legal_pages_v_version_status";
  DROP TYPE "cms"."enum_help_articles_category";
  DROP TYPE "cms"."enum_help_articles_status";
  DROP TYPE "cms"."enum__help_articles_v_version_category";
  DROP TYPE "cms"."enum__help_articles_v_version_status";
  DROP TYPE "cms"."enum_team_members_group";
  DROP TYPE "cms"."enum_team_members_status";
  DROP TYPE "cms"."enum__team_members_v_version_group";
  DROP TYPE "cms"."enum__team_members_v_version_status";`)
}
