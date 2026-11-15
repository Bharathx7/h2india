import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms"."media_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"transcript" varchar,
  	"prefix" varchar DEFAULT 'cms/av',
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
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "media_files_id" integer;
  CREATE INDEX "media_files_updated_at_idx" ON "cms"."media_files" USING btree ("updated_at");
  CREATE INDEX "media_files_created_at_idx" ON "cms"."media_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_files_filename_idx" ON "cms"."media_files" USING btree ("filename");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_files_fk" FOREIGN KEY ("media_files_id") REFERENCES "cms"."media_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_files_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."media_files" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."media_files" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_files_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_media_files_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "media_files_id";`)
}
