CREATE TABLE "core"."grievances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"type" text NOT NULL,
	"page_url" text,
	"description" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"mobile" text,
	"files" text[] DEFAULT '{}'::text[] NOT NULL,
	"user_id" uuid,
	"status" text DEFAULT 'Received' NOT NULL,
	"team" text,
	"public_note" text,
	"outcome" text,
	"resolve_by" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."grievances" ADD CONSTRAINT "grievances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "grievances_reference" ON "core"."grievances" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "grievances_status" ON "core"."grievances" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "grievances_email" ON "core"."grievances" USING btree (lower("email"));