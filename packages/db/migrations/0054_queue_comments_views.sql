CREATE TABLE "core"."queue_field_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"queue" text NOT NULL,
	"subject_id" text NOT NULL,
	"field" text NOT NULL,
	"note" text NOT NULL,
	"author_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."queue_saved_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"queue" text NOT NULL,
	"name" text NOT NULL,
	"view" text DEFAULT 'all' NOT NULL,
	"search" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."queue_field_comments" ADD CONSTRAINT "queue_field_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."queue_saved_views" ADD CONSTRAINT "queue_saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "queue_field_comments_item" ON "core"."queue_field_comments" USING btree ("queue","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "queue_saved_views_name" ON "core"."queue_saved_views" USING btree ("user_id","queue","name");