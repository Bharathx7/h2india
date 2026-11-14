CREATE TABLE "core"."company_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"claimant_id" uuid NOT NULL,
	"method" text NOT NULL,
	"email" text,
	"email_verified_at" timestamp with time zone,
	"gstin" text,
	"letter_file_id" text,
	"status" text DEFAULT 'Started' NOT NULL,
	"reason" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."company_claims" ADD CONSTRAINT "company_claims_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."company_claims" ADD CONSTRAINT "company_claims_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."company_claims" ADD CONSTRAINT "company_claims_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_claims_org" ON "core"."company_claims" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "company_claims_claimant" ON "core"."company_claims" USING btree ("claimant_id");