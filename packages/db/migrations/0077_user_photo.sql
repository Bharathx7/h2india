-- Profile picture for everyone (founder, 20 Nov 2026): one nullable column; nothing is removed or changed.
ALTER TABLE "core"."users" ADD COLUMN "photo_file_id" uuid;