ALTER TABLE "core"."disputes" ADD COLUMN "wanted_fix" text;--> statement-breakpoint
-- destructive-ok: decline_note was added in 0055 (same unreleased branch) and never held data; 693:8 has one free-text reason.
ALTER TABLE "core"."orders" DROP COLUMN "decline_note";