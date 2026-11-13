CREATE TABLE "core"."data_rights_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"kind" text NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"details" text,
	"status" text DEFAULT 'Received' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"plan" jsonb,
	"plan_by" uuid,
	"resolution" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_rights_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "core"."data_rights_requests" ADD CONSTRAINT "data_rights_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."data_rights_requests" ADD CONSTRAINT "data_rights_requests_plan_by_users_id_fk" FOREIGN KEY ("plan_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_rights_status" ON "core"."data_rights_requests" USING btree ("status","due_at");