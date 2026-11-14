CREATE TABLE "core"."payout_bank_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"holder_name" text NOT NULL,
	"account_last4" text NOT NULL,
	"account_cipher" text NOT NULL,
	"ifsc" text NOT NULL,
	"branch" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"check_method" text,
	"bank_name" text,
	"name_matches" jsonb,
	"fail_reason" text,
	"checked_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"hold_until" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."payout_bank_accounts" ADD CONSTRAINT "payout_bank_accounts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."payout_bank_accounts" ADD CONSTRAINT "payout_bank_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payout_bank_accounts_org" ON "core"."payout_bank_accounts" USING btree ("organisation_id","created_at");