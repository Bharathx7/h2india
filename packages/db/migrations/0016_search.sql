CREATE TABLE "core"."search_misses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"scope" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."search_outbox" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"index_uid" text NOT NULL,
	"record_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "search_misses_created_idx" ON "core"."search_misses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "search_misses_query_idx" ON "core"."search_misses" USING btree ("query");--> statement-breakpoint
CREATE INDEX "search_outbox_waiting_idx" ON "core"."search_outbox" USING btree ("seq") WHERE "core"."search_outbox"."processed_at" IS NULL;