ALTER TABLE "core"."dispatch_date_changes" ADD COLUMN "requested_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."dispatch_date_changes" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."dispatch_date_changes" ADD COLUMN "decided_by" uuid;--> statement-breakpoint
ALTER TABLE "core"."dispatch_date_changes" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "delivered_on" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "received_by" text;--> statement-breakpoint
ALTER TABLE "core"."dispatch_date_changes" ADD CONSTRAINT "dispatch_date_changes_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;