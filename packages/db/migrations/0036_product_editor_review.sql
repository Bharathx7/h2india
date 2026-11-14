CREATE TABLE "core"."product_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'In review' NOT NULL,
	"data" jsonb NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"assignee_id" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "stock" text DEFAULT 'made_to_order' NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "stock_qty" integer;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "core"."product_revisions" ADD CONSTRAINT "product_revisions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_revisions" ADD CONSTRAINT "product_revisions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_revisions" ADD CONSTRAINT "product_revisions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_revisions" ADD CONSTRAINT "product_revisions_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."product_revisions" ADD CONSTRAINT "product_revisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_revisions_queue" ON "core"."product_revisions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "product_revisions_product" ON "core"."product_revisions" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku" ON "core"."products" USING btree ("organisation_id","sku") WHERE "core"."products"."sku" is not null and "core"."products"."deleted_at" is null;