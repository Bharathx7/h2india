CREATE TABLE "core"."quote_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version_id" uuid NOT NULL,
	"rfq_item_id" uuid,
	"description" text NOT NULL,
	"hsn" text,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'units' NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"gst_rate_bps" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."quote_payment_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version_id" uuid NOT NULL,
	"percent_bps" integer NOT NULL,
	"trigger" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."quote_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"state" text DEFAULT 'Draft' NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"freight_paise" bigint DEFAULT 0 NOT NULL,
	"freight_gst_rate_bps" integer DEFAULT 0 NOT NULL,
	"delivery_terms" text,
	"freight_included" boolean DEFAULT false NOT NULL,
	"lead_time_weeks" integer,
	"valid_until" timestamp with time zone,
	"warranty_months" integer,
	"notes" text,
	"change_note" text,
	"documents" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"subtotal_paise" bigint DEFAULT 0 NOT NULL,
	"gst_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"sent_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"rfq_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"buyer_organisation_id" uuid NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"sent_version" integer,
	"withdrawn_at" timestamp with time zone,
	"withdraw_reason" text,
	"withdraw_note" text,
	"accepted_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "core"."rfq_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rfq_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'units' NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."rfq_moderation_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rfq_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text,
	"moderator_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."rfq_suppliers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rfq_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"status" text DEFAULT 'Sent' NOT NULL,
	"viewed_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"decline_reason" text,
	"decline_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."rfqs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"requirements" text,
	"delivery_site_id" uuid,
	"billing_gstin_id" uuid,
	"required_by" timestamp with time zone,
	"offer_deadline" timestamp with time zone,
	"delivery_terms" text,
	"payment_terms" text,
	"attachments" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"source" text,
	"submitted_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "rfqs_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "core"."quote_lines" ADD CONSTRAINT "quote_lines_version_id_quote_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."quote_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quote_lines" ADD CONSTRAINT "quote_lines_rfq_item_id_rfq_items_id_fk" FOREIGN KEY ("rfq_item_id") REFERENCES "core"."rfq_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quote_payment_lines" ADD CONSTRAINT "quote_payment_lines_version_id_quote_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."quote_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quote_versions" ADD CONSTRAINT "quote_versions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "core"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quote_versions" ADD CONSTRAINT "quote_versions_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quotes" ADD CONSTRAINT "quotes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "core"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quotes" ADD CONSTRAINT "quotes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quotes" ADD CONSTRAINT "quotes_buyer_organisation_id_organisations_id_fk" FOREIGN KEY ("buyer_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_items" ADD CONSTRAINT "rfq_items_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "core"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_items" ADD CONSTRAINT "rfq_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_moderation_decisions" ADD CONSTRAINT "rfq_moderation_decisions_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "core"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_moderation_decisions" ADD CONSTRAINT "rfq_moderation_decisions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_suppliers" ADD CONSTRAINT "rfq_suppliers_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "core"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_suppliers" ADD CONSTRAINT "rfq_suppliers_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfqs" ADD CONSTRAINT "rfqs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfqs" ADD CONSTRAINT "rfqs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfqs" ADD CONSTRAINT "rfqs_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfqs" ADD CONSTRAINT "rfqs_delivery_site_id_delivery_sites_id_fk" FOREIGN KEY ("delivery_site_id") REFERENCES "core"."delivery_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfqs" ADD CONSTRAINT "rfqs_billing_gstin_id_organisation_gstins_id_fk" FOREIGN KEY ("billing_gstin_id") REFERENCES "core"."organisation_gstins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_lines_version" ON "core"."quote_lines" USING btree ("version_id","position");--> statement-breakpoint
CREATE INDEX "quote_payment_lines_version" ON "core"."quote_payment_lines" USING btree ("version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_versions_unique" ON "core"."quote_versions" USING btree ("quote_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_rfq_supplier" ON "core"."quotes" USING btree ("rfq_id","organisation_id");--> statement-breakpoint
CREATE INDEX "quotes_organisation" ON "core"."quotes" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "quotes_buyer" ON "core"."quotes" USING btree ("buyer_organisation_id");--> statement-breakpoint
CREATE INDEX "rfq_items_rfq" ON "core"."rfq_items" USING btree ("rfq_id","position");--> statement-breakpoint
CREATE INDEX "rfq_moderation_rfq" ON "core"."rfq_moderation_decisions" USING btree ("rfq_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_suppliers_unique" ON "core"."rfq_suppliers" USING btree ("rfq_id","organisation_id");--> statement-breakpoint
CREATE INDEX "rfq_suppliers_organisation" ON "core"."rfq_suppliers" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "rfqs_organisation" ON "core"."rfqs" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "rfqs_status" ON "core"."rfqs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "core"."rfq_items" ADD CONSTRAINT "rfq_items_quantity_positive" CHECK ("quantity" > 0);--> statement-breakpoint
ALTER TABLE "core"."quote_lines" ADD CONSTRAINT "quote_lines_quantity_positive" CHECK ("quantity" > 0);--> statement-breakpoint
ALTER TABLE "core"."quote_lines" ADD CONSTRAINT "quote_lines_price_not_negative" CHECK ("unit_price_paise" >= 0);--> statement-breakpoint
ALTER TABLE "core"."quote_lines" ADD CONSTRAINT "quote_lines_gst_rate" CHECK ("gst_rate_bps" BETWEEN 0 AND 10000);--> statement-breakpoint
ALTER TABLE "core"."quote_payment_lines" ADD CONSTRAINT "quote_payment_lines_percent" CHECK ("percent_bps" > 0 AND "percent_bps" <= 10000);--> statement-breakpoint
ALTER TABLE "core"."quote_versions" ADD CONSTRAINT "quote_versions_state" CHECK ("state" IN ('Draft', 'Sent'));
