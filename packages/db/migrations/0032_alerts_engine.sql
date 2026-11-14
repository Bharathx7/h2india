CREATE TABLE "core"."alert_sends" (
	"id" uuid PRIMARY KEY NOT NULL,
	"alert_id" uuid NOT NULL,
	"record_id" text NOT NULL,
	"title" text NOT NULL,
	"meta" text DEFAULT '' NOT NULL,
	"href" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"matched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."search_outbox" ADD COLUMN "alerts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."alerts" ADD COLUMN "last_matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."alerts" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."alert_sends" ADD CONSTRAINT "alert_sends_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "core"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_sends_once" ON "core"."alert_sends" USING btree ("alert_id","record_id");--> statement-breakpoint
CREATE INDEX "alert_sends_waiting" ON "core"."alert_sends" USING btree ("alert_id") WHERE "core"."alert_sends"."sent_at" IS NULL;--> statement-breakpoint
CREATE INDEX "search_outbox_alerts_idx" ON "core"."search_outbox" USING btree ("seq") WHERE "core"."search_outbox"."processed_at" IS NOT NULL AND "core"."search_outbox"."alerts_at" IS NULL;--> statement-breakpoint
-- Changes applied before alerts existed are not matched (no flood of old records on the first run).
UPDATE "core"."search_outbox" SET "alerts_at" = "processed_at" WHERE "processed_at" IS NOT NULL;
