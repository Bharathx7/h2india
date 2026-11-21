-- Admins have full access, and approval exists only after a role split (founder, 21 Nov 2026, A199, option a).
-- 1. A buyer Admin can approve orders too.
INSERT INTO "core"."role_permissions" ("role_id", "permission_key")
SELECT r."id", 'order.approve' FROM "core"."roles" r
WHERE r."scope" = 'buyer' AND r."name" = 'Admin'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- 2. People on an old preset role (Approver, Requester, Sales, Catalogue, Finance, Viewer) with no ticks of their own
--    become Admin, with no order limit (founder chose option a).
UPDATE "core"."memberships" SET "role" = 'Admin', "order_limit_paise" = NULL, "updated_at" = now()
WHERE "role" <> 'Admin' AND "permissions" IS NULL;
--> statement-breakpoint
-- 3. People an admin limited on purpose (their own ticks) keep exactly those ticks, now named Custom.
UPDATE "core"."memberships" SET "role" = 'Custom', "updated_at" = now()
WHERE "role" <> 'Admin' AND "permissions" IS NOT NULL;
--> statement-breakpoint
-- 4. An Admin has no order limit: their orders need no approval.
UPDATE "core"."memberships" SET "order_limit_paise" = NULL, "updated_at" = now()
WHERE "role" = 'Admin' AND "order_limit_paise" IS NOT NULL;
--> statement-breakpoint
-- 5. Open invitations follow the same rule.
UPDATE "core"."invitations" SET "role" = 'Admin', "updated_at" = now()
WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL AND "role" <> 'Admin' AND "permissions" IS NULL;
--> statement-breakpoint
UPDATE "core"."invitations" SET "role" = 'Custom', "updated_at" = now()
WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL AND "role" <> 'Admin' AND "permissions" IS NOT NULL;
