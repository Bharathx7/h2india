ALTER TABLE "core"."shipments" ADD COLUMN "irn" text;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "irn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "certificates_note" text;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "certificates_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "lr_number" text;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "expected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "pod_file_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "pod_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "code_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;