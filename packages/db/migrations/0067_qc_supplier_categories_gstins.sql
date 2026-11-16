CREATE TABLE "core"."category_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"requested_by" uuid,
	"class_id" text NOT NULL,
	"parent_id" uuid,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"example" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"category_id" uuid,
	"reason" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."quote_versions" ADD COLUMN "supplier_gstin_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."category_requests" ADD CONSTRAINT "category_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."category_requests" ADD CONSTRAINT "category_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "core"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."category_requests" ADD CONSTRAINT "category_requests_class_id_catalogue_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "core"."catalogue_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."category_requests" ADD CONSTRAINT "category_requests_parent_id_catalogue_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."category_requests" ADD CONSTRAINT "category_requests_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."category_requests" ADD CONSTRAINT "category_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_requests_organisation" ON "core"."category_requests" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "category_requests_status" ON "core"."category_requests" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "core"."quote_versions" ADD CONSTRAINT "quote_versions_supplier_gstin_id_organisation_gstins_id_fk" FOREIGN KEY ("supplier_gstin_id") REFERENCES "core"."organisation_gstins"("id") ON DELETE no action ON UPDATE no action;