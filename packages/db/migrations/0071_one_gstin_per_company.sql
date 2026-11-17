ALTER TABLE "core"."organisation_gstins" ADD COLUMN "retired_at" timestamp with time zone;--> statement-breakpoint
-- One GSTIN per company (founder QC, 17 Nov 2026, A189): each company keeps its default GSTIN, else its oldest; the
-- others are retired, not deleted, so old quotes and orders still show what they were issued under.
UPDATE "core"."organisation_gstins" g SET "retired_at" = now()
WHERE g."id" <> (
  SELECT k."id" FROM "core"."organisation_gstins" k
  WHERE k."organisation_id" = g."organisation_id"
  ORDER BY k."is_default" DESC, k."created_at" ASC
  LIMIT 1
);--> statement-breakpoint
UPDATE "core"."organisation_gstins" SET "is_default" = (retired_at IS NULL);--> statement-breakpoint
-- Delivery sites bill to the company's GSTIN now; a site that named a retired one goes back to the company's.
UPDATE "core"."delivery_sites" SET "gstin_id" = NULL
WHERE "gstin_id" IN (SELECT "id" FROM "core"."organisation_gstins" WHERE "retired_at" IS NOT NULL);
