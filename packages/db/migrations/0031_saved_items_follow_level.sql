CREATE TABLE "core"."saved_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"title" text NOT NULL,
	"href" text NOT NULL,
	"meta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."follows" ADD COLUMN "level" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."saved_items" ADD CONSTRAINT "saved_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_one" ON "core"."saved_items" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "saved_items_owner" ON "core"."saved_items" USING btree ("user_id","created_at");