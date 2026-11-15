CREATE TABLE "core"."suspension_appeals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"sent_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."suspension_appeals" ADD CONSTRAINT "suspension_appeals_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."suspension_appeals" ADD CONSTRAINT "suspension_appeals_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."suspension_appeals" ADD CONSTRAINT "suspension_appeals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suspension_appeals_org" ON "core"."suspension_appeals" USING btree ("organisation_id","status");