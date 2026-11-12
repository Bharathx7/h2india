import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_articles_workflow" AS ENUM('Draft', 'In review', 'Legal check', 'Scheduled', 'Published');
  CREATE TYPE "cms"."enum__articles_v_version_workflow" AS ENUM('Draft', 'In review', 'Legal check', 'Scheduled', 'Published');
  CREATE TYPE "cms"."enum_corrections_status" AS ENUM('Open', 'Resolved', 'Rejected');
  CREATE TYPE "cms"."enum_corrections_source" AS ENUM('reader', 'editor');
  CREATE TABLE "cms"."articles_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"note" varchar,
  	"by_id" integer
  );
  
  CREATE TABLE "cms"."_articles_v_version_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"note" varchar,
  	"by_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."corrections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"article_id" integer NOT NULL,
  	"status" "cms"."enum_corrections_status" DEFAULT 'Open' NOT NULL,
  	"source" "cms"."enum_corrections_source" DEFAULT 'reader' NOT NULL,
  	"description" varchar NOT NULL,
  	"reporter_email" varchar,
  	"resolution" varchar,
  	"resolved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."articles" ADD COLUMN "workflow" "cms"."enum_articles_workflow" DEFAULT 'Draft';
  ALTER TABLE "cms"."articles" ADD COLUMN "publish_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."articles" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_workflow" "cms"."enum__articles_v_version_workflow" DEFAULT 'Draft';
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_publish_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_articles_v" ADD COLUMN "version_published_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "corrections_id" integer;
  ALTER TABLE "cms"."articles_corrections" ADD CONSTRAINT "articles_corrections_by_id_editors_id_fk" FOREIGN KEY ("by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."articles_corrections" ADD CONSTRAINT "articles_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_by_id_editors_id_fk" FOREIGN KEY ("by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."corrections" ADD CONSTRAINT "corrections_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "cms"."articles"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articles_corrections_order_idx" ON "cms"."articles_corrections" USING btree ("_order");
  CREATE INDEX "articles_corrections_parent_id_idx" ON "cms"."articles_corrections" USING btree ("_parent_id");
  CREATE INDEX "articles_corrections_by_idx" ON "cms"."articles_corrections" USING btree ("by_id");
  CREATE INDEX "_articles_v_version_corrections_order_idx" ON "cms"."_articles_v_version_corrections" USING btree ("_order");
  CREATE INDEX "_articles_v_version_corrections_parent_id_idx" ON "cms"."_articles_v_version_corrections" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_corrections_by_idx" ON "cms"."_articles_v_version_corrections" USING btree ("by_id");
  CREATE INDEX "corrections_article_idx" ON "cms"."corrections" USING btree ("article_id");
  CREATE INDEX "corrections_updated_at_idx" ON "cms"."corrections" USING btree ("updated_at");
  CREATE INDEX "corrections_created_at_idx" ON "cms"."corrections" USING btree ("created_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_corrections_fk" FOREIGN KEY ("corrections_id") REFERENCES "cms"."corrections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_workflow_idx" ON "cms"."articles" USING btree ("workflow");
  CREATE INDEX "articles_publish_at_idx" ON "cms"."articles" USING btree ("publish_at");
  CREATE INDEX "articles_published_at_idx" ON "cms"."articles" USING btree ("published_at");
  CREATE INDEX "_articles_v_version_version_workflow_idx" ON "cms"."_articles_v" USING btree ("version_workflow");
  CREATE INDEX "_articles_v_version_version_publish_at_idx" ON "cms"."_articles_v" USING btree ("version_publish_at");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "cms"."_articles_v" USING btree ("version_published_at");
  CREATE INDEX "payload_locked_documents_rels_corrections_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("corrections_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."articles_corrections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_articles_v_version_corrections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."corrections" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."articles_corrections" CASCADE;
  DROP TABLE "cms"."_articles_v_version_corrections" CASCADE;
  DROP TABLE "cms"."corrections" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_corrections_fk";
  
  DROP INDEX "cms"."articles_workflow_idx";
  DROP INDEX "cms"."articles_publish_at_idx";
  DROP INDEX "cms"."articles_published_at_idx";
  DROP INDEX "cms"."_articles_v_version_version_workflow_idx";
  DROP INDEX "cms"."_articles_v_version_version_publish_at_idx";
  DROP INDEX "cms"."_articles_v_version_version_published_at_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_corrections_id_idx";
  ALTER TABLE "cms"."articles" DROP COLUMN "workflow";
  ALTER TABLE "cms"."articles" DROP COLUMN "publish_at";
  ALTER TABLE "cms"."articles" DROP COLUMN "published_at";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_workflow";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_publish_at";
  ALTER TABLE "cms"."_articles_v" DROP COLUMN "version_published_at";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "corrections_id";
  DROP TYPE "cms"."enum_articles_workflow";
  DROP TYPE "cms"."enum__articles_v_version_workflow";
  DROP TYPE "cms"."enum_corrections_status";
  DROP TYPE "cms"."enum_corrections_source";`)
}
