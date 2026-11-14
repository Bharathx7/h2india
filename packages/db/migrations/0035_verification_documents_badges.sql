CREATE TABLE "core"."supplier_badges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"evidence" text NOT NULL,
	"document_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"verified_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."verification_checks" (
	"organisation_id" uuid NOT NULL,
	"check" text NOT NULL,
	"result" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."verification_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text,
	"scope" text,
	"number" text,
	"file_id" uuid,
	"issued_by" text,
	"issued_on" timestamp with time zone,
	"expires_on" timestamp with time zone,
	"visit_at" timestamp with time zone,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"reason" text,
	"checked_at" timestamp with time zone,
	"checked_by" uuid,
	"notice_sent_at" timestamp with time zone,
	"replaces" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."supplier_reviews" ADD COLUMN "checks" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."supplier_badges" ADD CONSTRAINT "supplier_badges_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."supplier_badges" ADD CONSTRAINT "supplier_badges_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."verification_checks" ADD CONSTRAINT "verification_checks_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."verification_documents" ADD CONSTRAINT "verification_documents_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."verification_documents" ADD CONSTRAINT "verification_documents_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."verification_documents" ADD CONSTRAINT "verification_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_badges_kind" ON "core"."supplier_badges" USING btree ("organisation_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_checks_one" ON "core"."verification_checks" USING btree ("organisation_id","check");--> statement-breakpoint
CREATE INDEX "verification_documents_org" ON "core"."verification_documents" USING btree ("organisation_id","type");--> statement-breakpoint
CREATE INDEX "verification_documents_expiry" ON "core"."verification_documents" USING btree ("expires_on") WHERE "core"."verification_documents"."status" = 'Verified';--> statement-breakpoint
-- Step 8.2: "Verified" now means an operator granted the Verified supplier badge from recorded evidence. Companies
-- marked Verified by the automatic GSTIN check alone become "GST verified" (playbook 8.2 watch-out).
UPDATE "core"."organisations" SET "verification" = 'GST verified' WHERE "verification" = 'Verified';
