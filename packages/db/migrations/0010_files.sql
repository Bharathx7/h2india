CREATE TABLE "core"."files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'Uploading' NOT NULL,
	"uploaded_by" uuid,
	"organisation_id" uuid,
	"upload_key_hash" text,
	"attached_type" text,
	"attached_id" text,
	"name" text NOT NULL,
	"declared_type" text NOT NULL,
	"declared_bytes" bigint NOT NULL,
	"detected_type" text,
	"bytes" bigint,
	"sha256" text,
	"quarantine_key" text NOT NULL,
	"bucket" text,
	"object_key" text,
	"variants" jsonb,
	"reject_reason" text,
	"threat" text,
	"checked_at" timestamp with time zone,
	"delete_after" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "core"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."files" ADD CONSTRAINT "files_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "core"."files" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "files_attached_idx" ON "core"."files" USING btree ("attached_type","attached_id");--> statement-breakpoint
CREATE INDEX "files_org_idx" ON "core"."files" USING btree ("organisation_id");