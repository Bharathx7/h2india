-- Delete permanently (founder, 19 Nov 2026, A197): a new operator permission, held only by Super admin.
-- Adds rows only; nothing is removed or changed.
INSERT INTO "core"."permissions" ("key", "layer", "description", "sensitive") VALUES
  ('content.purge', 'operator', 'Delete content permanently (Super admin only; it can''t be undone)', true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."role_permissions" ("role_id", "permission_key")
SELECT r."id", 'content.purge' FROM "core"."roles" r
WHERE r."scope" = 'operator' AND r."name" = 'Super admin'
ON CONFLICT DO NOTHING;
