CREATE TABLE "core"."datasheet_extractions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"status" text DEFAULT 'Queued' NOT NULL,
	"engine" text,
	"engine_version" text,
	"region" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decisions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_id" uuid,
	"error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."datasheet_extractions" ADD CONSTRAINT "datasheet_extractions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."datasheet_extractions" ADD CONSTRAINT "datasheet_extractions_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."datasheet_extractions" ADD CONSTRAINT "datasheet_extractions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."datasheet_extractions" ADD CONSTRAINT "datasheet_extractions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "datasheet_extractions_org" ON "core"."datasheet_extractions" USING btree ("organisation_id","created_at");