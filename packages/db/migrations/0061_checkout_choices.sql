ALTER TABLE "core"."carts" ADD COLUMN "delivery_site_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD COLUMN "receiver_name" text;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD COLUMN "receiver_mobile" text;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD COLUMN "billing_gstin_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD COLUMN "po_number" text;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD COLUMN "po_file_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD COLUMN "po_number" text;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD COLUMN "po_file_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD CONSTRAINT "carts_delivery_site_id_delivery_sites_id_fk" FOREIGN KEY ("delivery_site_id") REFERENCES "core"."delivery_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD CONSTRAINT "carts_billing_gstin_id_organisation_gstins_id_fk" FOREIGN KEY ("billing_gstin_id") REFERENCES "core"."organisation_gstins"("id") ON DELETE no action ON UPDATE no action;