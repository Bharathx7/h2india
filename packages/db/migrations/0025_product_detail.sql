CREATE TABLE "core"."listing_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"problem" text NOT NULL,
	"details" text NOT NULL,
	"email" text,
	"reporter_id" uuid,
	"status" text DEFAULT 'Received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."product_questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"asker_id" uuid NOT NULL,
	"question" text NOT NULL,
	"shared_company" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "gst_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "min_order" integer;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "application_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "attribute_notes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "installation" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "certificates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "documents" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "warranty_months" integer;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "warranty_note" text;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "service_cities" text;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "service_note" text;--> statement-breakpoint
ALTER TABLE "core"."listing_reports" ADD CONSTRAINT "listing_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."listing_reports" ADD CONSTRAINT "listing_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_questions" ADD CONSTRAINT "product_questions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_questions" ADD CONSTRAINT "product_questions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_questions" ADD CONSTRAINT "product_questions_asker_id_users_id_fk" FOREIGN KEY ("asker_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_reports_status" ON "core"."listing_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "product_questions_supplier" ON "core"."product_questions" USING btree ("organisation_id","created_at");