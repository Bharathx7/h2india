ALTER TABLE "core"."products" ADD COLUMN "indicative_min_paise" bigint;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "indicative_max_paise" bigint;--> statement-breakpoint
-- A141 (founder, 13 Nov 2026): an indicative range is allowed on the product page of a quote item. The price rule
-- becomes: quote = no figures; fixed = a price; indicative = a range (min ≤ max), never a fixed price.
-- destructive-ok: replaces the step 6.3 check constraint with the wider rule; no data changes.
ALTER TABLE "core"."products" DROP CONSTRAINT "products_price_rule";
--> statement-breakpoint
ALTER TABLE "core"."products" ADD CONSTRAINT "products_price_rule" CHECK (
  ("pricing" = 'quote' AND "price_paise" IS NULL AND "price_currency" IS NULL AND "indicative_min_paise" IS NULL AND "indicative_max_paise" IS NULL)
  OR ("pricing" = 'fixed' AND "price_paise" IS NOT NULL AND "price_paise" > 0 AND "price_currency" IS NOT NULL AND "indicative_min_paise" IS NULL AND "indicative_max_paise" IS NULL)
  OR ("pricing" = 'indicative' AND "price_paise" IS NULL AND "price_currency" IS NOT NULL AND "indicative_min_paise" > 0 AND "indicative_max_paise" >= "indicative_min_paise")
);
--> statement-breakpoint
-- A105 (founder, 13 Nov 2026): Ports & shipping shows on the marketplace landing and menu, as drawn (390:7668).
UPDATE "core"."catalogue_applications" SET "hidden_at" = NULL WHERE "id" = 'ports-shipping';
--> statement-breakpoint
-- A108 (founder, 13 Nov 2026): the Electrolysers attributes drawn on its filter panel (392:5007) are launch data.
-- Options as Doc 1 §9.2 lists them; no allowed ranges or required flags are invented: operators set those.
INSERT INTO "core"."catalogue_attributes" ("id", "category_id", "key", "label", "type", "unit", "options", "required", "filterable", "comparable", "test_condition", "display_group", "position")
SELECT gen_random_uuid(), c."id", a.key, a.label, a.type, a.unit, a.options::text[], false, true, a.comparable, a.test, a.grp, a.pos
FROM "core"."catalogue_categories" c,
  (VALUES
    ('h2_output', 'H₂ output', 'number', 'kg/day', '{}', true, NULL, 'Performance', 1),
    ('rated_power', 'Rated power', 'number', 'kW', '{}', true, NULL, 'Performance', 2),
    ('output_pressure', 'Output pressure', 'number', 'bar(g)', '{}', true, NULL, 'Performance', 3),
    ('specific_energy', 'Specific energy', 'number', 'kWh/kg', '{}', true, 'At rated load, beginning of life', 'Performance', 4),
    ('purity', 'Purity', 'choice', NULL, '{99.9%,99.97%,99.999%}', false, NULL, 'Gas quality', 5),
    ('readiness', 'Readiness', 'choice', NULL, '{"TRL 9 · commercial","TRL 7–8 · demonstration"}', false, NULL, 'Physical', 6)
  ) AS a(key, label, type, unit, options, comparable, test, grp, pos)
WHERE c."slug" = 'electrolysers' AND c."parent_id" IS NULL AND c."deleted_at" IS NULL
ON CONFLICT ("category_id", "key") WHERE "deleted_at" IS NULL
DO UPDATE SET "sample" = false, "label" = EXCLUDED."label", "options" = EXCLUDED."options", "min" = NULL, "max" = NULL,
  "required" = false, "filterable" = true, "comparable" = EXCLUDED."comparable", "test_condition" = EXCLUDED."test_condition";
