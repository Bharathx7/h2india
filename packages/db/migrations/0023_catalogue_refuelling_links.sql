-- Browse by application (step 6.2): the categories the Refuelling & mobility page draws in its "What goes into a
-- refuelling station" chain (754:14685), plus Refuelling stations & modules. The other applications are not drawn;
-- operators choose their categories in admin Catalogue (Choose applications).
INSERT INTO "core"."catalogue_category_applications" ("category_id", "application_id")
SELECT "id", 'refuelling-mobility' FROM "core"."catalogue_categories"
WHERE "parent_id" IS NULL AND "deleted_at" IS NULL
  AND "slug" IN ('compression-systems', 'tanks-cylinders', 'dispensers', 'sensors-detectors', 'refuelling-stations-modules')
ON CONFLICT DO NOTHING;
