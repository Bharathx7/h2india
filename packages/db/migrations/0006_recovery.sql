CREATE TABLE "core"."recovery_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'Started' NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid,
	"organisation_id" uuid,
	"email_verified_at" timestamp with time zone,
	"mobile_verified_at" timestamp with time zone,
	"new_mobile" text,
	"new_mobile_verified_at" timestamp with time zone,
	"new_email" text,
	"reference" text,
	"contact_name" text,
	"contact_company" text,
	"contact_email" text,
	"document_file_id" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_requests_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "recovery_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "core"."recovery_requests" ADD CONSTRAINT "recovery_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."recovery_requests" ADD CONSTRAINT "recovery_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."recovery_requests" ADD CONSTRAINT "recovery_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recovery_requests_user_idx" ON "core"."recovery_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recovery_requests_org_idx" ON "core"."recovery_requests" USING btree ("organisation_id");