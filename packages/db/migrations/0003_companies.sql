CREATE TABLE "core"."invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "core"."join_drafts" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"path" text,
	"organisation_id" uuid,
	"email" text,
	"mobile" text,
	"mobile_verified_at" timestamp with time zone,
	"full_name" text,
	"job_role" text,
	"terms_accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."join_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_reminder_at" timestamp with time zone,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"order_limit_paise" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."organisation_gstins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"gstin" text NOT NULL,
	"state_code" text NOT NULL,
	"place" text,
	"portal_status" text DEFAULT 'Pending' NOT NULL,
	"legal_name" text,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_gstins_gstin_unique" UNIQUE("gstin")
);
--> statement-breakpoint
CREATE TABLE "core"."organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"legal_name" text NOT NULL,
	"pan" text,
	"state" text,
	"registered_address" text,
	"verification" text DEFAULT 'Unverified' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "mobile" text;--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "mobile_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "job_role" text;--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "profile_type" text;--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."invitations" ADD CONSTRAINT "invitations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."join_drafts" ADD CONSTRAINT "join_drafts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."join_requests" ADD CONSTRAINT "join_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."join_requests" ADD CONSTRAINT "join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."join_requests" ADD CONSTRAINT "join_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."organisation_gstins" ADD CONSTRAINT "organisation_gstins_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."organisations" ADD CONSTRAINT "organisations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitations_org_idx" ON "core"."invitations" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "join_drafts_expires_at_idx" ON "core"."join_drafts" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "join_requests_one_pending" ON "core"."join_requests" USING btree ("organisation_id","user_id") WHERE "core"."join_requests"."status" = 'Pending';--> statement-breakpoint
CREATE INDEX "join_requests_user_idx" ON "core"."join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_unique" ON "core"."memberships" USING btree ("organisation_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "core"."memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organisation_gstins_organisation_idx" ON "core"."organisation_gstins" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organisations_pan_unique" ON "core"."organisations" USING btree ("pan") WHERE "core"."organisations"."pan" IS NOT NULL AND "core"."organisations"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "organisations_legal_name_idx" ON "core"."organisations" USING btree (lower("legal_name"));