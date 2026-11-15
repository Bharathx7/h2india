-- destructive-ok: vehicle_or_tracking and proof_file_ids came in 0055 on the same unreleased branch and never held data;
-- 693:814 splits them into LR number, expected date and proof of delivery (0058).
-- destructive-ok: 0055 columns on the same unreleased branch, never held data (693:814 checklist).
ALTER TABLE "core"."shipments" ALTER COLUMN "invoice_number" DROP NOT NULL;--> statement-breakpoint
-- destructive-ok: 0055 columns on the same unreleased branch, never held data (693:814 checklist).
ALTER TABLE "core"."shipments" ALTER COLUMN "transporter" DROP NOT NULL;--> statement-breakpoint
-- destructive-ok: 0055 columns on the same unreleased branch, never held data (693:814 checklist).
ALTER TABLE "core"."shipments" ALTER COLUMN "shipped_at" DROP DEFAULT;--> statement-breakpoint
-- destructive-ok: 0055 columns on the same unreleased branch, never held data (693:814 checklist).
ALTER TABLE "core"."shipments" ALTER COLUMN "shipped_at" DROP NOT NULL;--> statement-breakpoint
-- destructive-ok: 0055 columns on the same unreleased branch, never held data (693:814 checklist).
ALTER TABLE "core"."shipments" DROP COLUMN "vehicle_or_tracking";--> statement-breakpoint
-- destructive-ok: 0055 columns on the same unreleased branch, never held data (693:814 checklist).
ALTER TABLE "core"."shipments" DROP COLUMN "proof_file_ids";