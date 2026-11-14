CREATE TABLE "core"."queue_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"queue" text NOT NULL,
	"subject_id" text NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"decision" text,
	"reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."queue_claims" ADD CONSTRAINT "queue_claims_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."queue_claims" ADD CONSTRAINT "queue_claims_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "queue_claims_item" ON "core"."queue_claims" USING btree ("queue","subject_id");