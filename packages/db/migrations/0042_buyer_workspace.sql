CREATE TABLE "core"."approval_delegations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"starts_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."buyer_settings" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"approval_above_paise" bigint,
	"approver_id" uuid,
	"second_approval" boolean DEFAULT false NOT NULL,
	"second_above_paise" bigint,
	"second_approver_id" uuid,
	"passkey_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"checklist_hidden" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."delivery_sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"state" text,
	"pincode" text,
	"gstin_id" uuid,
	"hours" text,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."project_list_items" (
	"list_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_list_items_list_id_product_id_pk" PRIMARY KEY("list_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "core"."project_lists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."organisation_gstins" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."approval_delegations" ADD CONSTRAINT "approval_delegations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."approval_delegations" ADD CONSTRAINT "approval_delegations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."approval_delegations" ADD CONSTRAINT "approval_delegations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."buyer_settings" ADD CONSTRAINT "buyer_settings_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."buyer_settings" ADD CONSTRAINT "buyer_settings_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."buyer_settings" ADD CONSTRAINT "buyer_settings_second_approver_id_users_id_fk" FOREIGN KEY ("second_approver_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."delivery_sites" ADD CONSTRAINT "delivery_sites_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."delivery_sites" ADD CONSTRAINT "delivery_sites_gstin_id_organisation_gstins_id_fk" FOREIGN KEY ("gstin_id") REFERENCES "core"."organisation_gstins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."project_list_items" ADD CONSTRAINT "project_list_items_list_id_project_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "core"."project_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."project_list_items" ADD CONSTRAINT "project_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."project_lists" ADD CONSTRAINT "project_lists_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."project_lists" ADD CONSTRAINT "project_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_delegations_org" ON "core"."approval_delegations" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "delivery_sites_org" ON "core"."delivery_sites" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "project_lists_org" ON "core"."project_lists" USING btree ("organisation_id");--> statement-breakpoint
-- Each company's first GSTIN is its default (574:638).
UPDATE "core"."organisation_gstins" SET "is_default" = true WHERE "id" IN (SELECT DISTINCT ON ("organisation_id") "id" FROM "core"."organisation_gstins" ORDER BY "organisation_id", "created_at");
