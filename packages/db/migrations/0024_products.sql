CREATE TABLE "core"."products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"model" text,
	"variant" text,
	"summary" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"certifications" text[] DEFAULT '{}'::text[] NOT NULL,
	"pricing" text DEFAULT 'quote' NOT NULL,
	"price_paise" bigint,
	"price_currency" char(3),
	"lead_time_min_weeks" integer,
	"lead_time_max_weeks" integer,
	"made_in_india" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"published_at" timestamp with time zone,
	"sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."products" ADD CONSTRAINT "products_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."products" ADD CONSTRAINT "products_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug" ON "core"."products" USING btree ("slug") WHERE "core"."products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_category" ON "core"."products" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "products_organisation" ON "core"."products" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "products_attributes" ON "core"."products" USING gin ("attributes");--> statement-breakpoint
-- A quote-only product never holds a price; a fixed-price one always has its amount and currency (step 6.4 rule).
ALTER TABLE "core"."products" ADD CONSTRAINT "products_price_rule" CHECK (
  ("pricing" = 'quote' AND "price_paise" IS NULL AND "price_currency" IS NULL)
  OR ("pricing" = 'fixed' AND "price_paise" IS NOT NULL AND "price_paise" > 0 AND "price_currency" IS NOT NULL)
);
