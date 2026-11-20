-- Team and roles (founder, 20 Nov 2026): content sections a staff member may change, and custom operator roles.
-- Adds a table and a column with a default; nothing is removed or changed.
CREATE TABLE "core"."operator_sections" (
	"user_id" uuid NOT NULL,
	"section" text NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operator_sections_user_id_section_pk" PRIMARY KEY("user_id","section")
);
--> statement-breakpoint
ALTER TABLE "core"."roles" ADD COLUMN "custom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."operator_sections" ADD CONSTRAINT "operator_sections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."operator_sections" ADD CONSTRAINT "operator_sections_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;