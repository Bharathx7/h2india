CREATE TABLE "core"."storefront_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"status" text DEFAULT 'In review' NOT NULL,
	"data" jsonb NOT NULL,
	"note" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."company_profiles" ADD COLUMN "storefront" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."storefront_revisions" ADD CONSTRAINT "storefront_revisions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."storefront_revisions" ADD CONSTRAINT "storefront_revisions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."storefront_revisions" ADD CONSTRAINT "storefront_revisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "storefront_revisions_queue" ON "core"."storefront_revisions" USING btree ("status","submitted_at");