ALTER TABLE "core"."disputes" ADD COLUMN "offer" text;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD COLUMN "offer_refund_paise" bigint;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD COLUMN "supplier_file_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD COLUMN "escalated_by" text;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD COLUMN "escalated_at" timestamp with time zone;