CREATE TABLE "core"."company_role_permissions" (
	"organisation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"permission_key" text NOT NULL,
	"granted" boolean NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."company_role_permissions" ADD CONSTRAINT "company_role_permissions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."company_role_permissions" ADD CONSTRAINT "company_role_permissions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "core"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_role_permissions_unique" ON "core"."company_role_permissions" USING btree ("organisation_id","role","permission_key");--> statement-breakpoint
-- Passkeys were removed on 17 Nov 2026 (A183): the bank change is confirmed with an email code.
UPDATE "core"."permissions" SET "description" = 'Change the payout bank account (confirmed with an email code)' WHERE "key" = 'payout_bank.change';
