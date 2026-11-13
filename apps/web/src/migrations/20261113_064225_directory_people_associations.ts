import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_people_expertise" AS ENUM('Electrolysers', 'Fuel cells', 'Storage and compression', 'Safety and approvals', 'Policy and finance', 'Research and testing');
  CREATE TYPE "cms"."enum_people_available_for" AS ENUM('Speaking', 'Consulting', 'Research collaboration');
  CREATE TYPE "cms"."enum_people_affiliation" AS ENUM('Company', 'Research institution', 'Government or PSU', 'Independent');
  CREATE TYPE "cms"."enum_people_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__people_v_version_expertise" AS ENUM('Electrolysers', 'Fuel cells', 'Storage and compression', 'Safety and approvals', 'Policy and finance', 'Research and testing');
  CREATE TYPE "cms"."enum__people_v_version_available_for" AS ENUM('Speaking', 'Consulting', 'Research collaboration');
  CREATE TYPE "cms"."enum__people_v_version_affiliation" AS ENUM('Company', 'Research institution', 'Government or PSU', 'Independent');
  CREATE TYPE "cms"."enum__people_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_associations_kind" AS ENUM('industry', 'alliance', 'chamber', 'government');
  CREATE TYPE "cms"."enum_associations_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__associations_v_version_kind" AS ENUM('industry', 'alliance', 'chamber', 'government');
  CREATE TYPE "cms"."enum__associations_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."people_expertise" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_people_expertise",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."people_available_for" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_people_available_for",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"role" varchar,
  	"organisation" varchar,
  	"city" varchar,
  	"state" varchar,
  	"affiliation" "cms"."enum_people_affiliation",
  	"bio" varchar,
  	"consent_recorded" boolean,
  	"consent_evidence" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_people_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."people_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_people_v_version_expertise" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__people_v_version_expertise",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_people_v_version_available_for" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__people_v_version_available_for",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_people_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_role" varchar,
  	"version_organisation" varchar,
  	"version_city" varchar,
  	"version_state" varchar,
  	"version_affiliation" "cms"."enum__people_v_version_affiliation",
  	"version_bio" varchar,
  	"version_consent_recorded" boolean,
  	"version_consent_evidence" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__people_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_people_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."associations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"kind" "cms"."enum_associations_kind",
  	"city" varchar,
  	"summary" varchar,
  	"member_companies" numeric,
  	"website" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_associations_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_associations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_kind" "cms"."enum__associations_v_version_kind",
  	"version_city" varchar,
  	"version_summary" varchar,
  	"version_member_companies" numeric,
  	"version_website" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__associations_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "people_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "associations_id" integer;
  ALTER TABLE "cms"."people_expertise" ADD CONSTRAINT "people_expertise_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."people_available_for" ADD CONSTRAINT "people_available_for_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."people_texts" ADD CONSTRAINT "people_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_people_v_version_expertise" ADD CONSTRAINT "_people_v_version_expertise_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_people_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_people_v_version_available_for" ADD CONSTRAINT "_people_v_version_available_for_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_people_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_people_v" ADD CONSTRAINT "_people_v_parent_id_people_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_people_v_texts" ADD CONSTRAINT "_people_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_people_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_associations_v" ADD CONSTRAINT "_associations_v_parent_id_associations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."associations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "people_expertise_order_idx" ON "cms"."people_expertise" USING btree ("order");
  CREATE INDEX "people_expertise_parent_idx" ON "cms"."people_expertise" USING btree ("parent_id");
  CREATE INDEX "people_available_for_order_idx" ON "cms"."people_available_for" USING btree ("order");
  CREATE INDEX "people_available_for_parent_idx" ON "cms"."people_available_for" USING btree ("parent_id");
  CREATE UNIQUE INDEX "people_slug_idx" ON "cms"."people" USING btree ("slug");
  CREATE INDEX "people_updated_at_idx" ON "cms"."people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "cms"."people" USING btree ("created_at");
  CREATE INDEX "people__status_idx" ON "cms"."people" USING btree ("_status");
  CREATE INDEX "people_texts_order_parent" ON "cms"."people_texts" USING btree ("order","parent_id");
  CREATE INDEX "_people_v_version_expertise_order_idx" ON "cms"."_people_v_version_expertise" USING btree ("order");
  CREATE INDEX "_people_v_version_expertise_parent_idx" ON "cms"."_people_v_version_expertise" USING btree ("parent_id");
  CREATE INDEX "_people_v_version_available_for_order_idx" ON "cms"."_people_v_version_available_for" USING btree ("order");
  CREATE INDEX "_people_v_version_available_for_parent_idx" ON "cms"."_people_v_version_available_for" USING btree ("parent_id");
  CREATE INDEX "_people_v_parent_idx" ON "cms"."_people_v" USING btree ("parent_id");
  CREATE INDEX "_people_v_version_version_slug_idx" ON "cms"."_people_v" USING btree ("version_slug");
  CREATE INDEX "_people_v_version_version_updated_at_idx" ON "cms"."_people_v" USING btree ("version_updated_at");
  CREATE INDEX "_people_v_version_version_created_at_idx" ON "cms"."_people_v" USING btree ("version_created_at");
  CREATE INDEX "_people_v_version_version__status_idx" ON "cms"."_people_v" USING btree ("version__status");
  CREATE INDEX "_people_v_created_at_idx" ON "cms"."_people_v" USING btree ("created_at");
  CREATE INDEX "_people_v_updated_at_idx" ON "cms"."_people_v" USING btree ("updated_at");
  CREATE INDEX "_people_v_latest_idx" ON "cms"."_people_v" USING btree ("latest");
  CREATE INDEX "_people_v_texts_order_parent" ON "cms"."_people_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "associations_slug_idx" ON "cms"."associations" USING btree ("slug");
  CREATE INDEX "associations_updated_at_idx" ON "cms"."associations" USING btree ("updated_at");
  CREATE INDEX "associations_created_at_idx" ON "cms"."associations" USING btree ("created_at");
  CREATE INDEX "associations__status_idx" ON "cms"."associations" USING btree ("_status");
  CREATE INDEX "_associations_v_parent_idx" ON "cms"."_associations_v" USING btree ("parent_id");
  CREATE INDEX "_associations_v_version_version_slug_idx" ON "cms"."_associations_v" USING btree ("version_slug");
  CREATE INDEX "_associations_v_version_version_updated_at_idx" ON "cms"."_associations_v" USING btree ("version_updated_at");
  CREATE INDEX "_associations_v_version_version_created_at_idx" ON "cms"."_associations_v" USING btree ("version_created_at");
  CREATE INDEX "_associations_v_version_version__status_idx" ON "cms"."_associations_v" USING btree ("version__status");
  CREATE INDEX "_associations_v_created_at_idx" ON "cms"."_associations_v" USING btree ("created_at");
  CREATE INDEX "_associations_v_updated_at_idx" ON "cms"."_associations_v" USING btree ("updated_at");
  CREATE INDEX "_associations_v_latest_idx" ON "cms"."_associations_v" USING btree ("latest");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "cms"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_associations_fk" FOREIGN KEY ("associations_id") REFERENCES "cms"."associations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_associations_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("associations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."people_expertise" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."people_available_for" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."people_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_people_v_version_expertise" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_people_v_version_available_for" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_people_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_people_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."associations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_associations_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."people_expertise" CASCADE;
  DROP TABLE "cms"."people_available_for" CASCADE;
  DROP TABLE "cms"."people" CASCADE;
  DROP TABLE "cms"."people_texts" CASCADE;
  DROP TABLE "cms"."_people_v_version_expertise" CASCADE;
  DROP TABLE "cms"."_people_v_version_available_for" CASCADE;
  DROP TABLE "cms"."_people_v" CASCADE;
  DROP TABLE "cms"."_people_v_texts" CASCADE;
  DROP TABLE "cms"."associations" CASCADE;
  DROP TABLE "cms"."_associations_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_people_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_associations_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_people_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_associations_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "people_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "associations_id";
  DROP TYPE "cms"."enum_people_expertise";
  DROP TYPE "cms"."enum_people_available_for";
  DROP TYPE "cms"."enum_people_affiliation";
  DROP TYPE "cms"."enum_people_status";
  DROP TYPE "cms"."enum__people_v_version_expertise";
  DROP TYPE "cms"."enum__people_v_version_available_for";
  DROP TYPE "cms"."enum__people_v_version_affiliation";
  DROP TYPE "cms"."enum__people_v_version_status";
  DROP TYPE "cms"."enum_associations_kind";
  DROP TYPE "cms"."enum_associations_status";
  DROP TYPE "cms"."enum__associations_v_version_kind";
  DROP TYPE "cms"."enum__associations_v_version_status";`)
}
