CREATE TABLE "core"."report_daily" (
	"day" date NOT NULL,
	"metric" text NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "report_daily_day_metric_pk" PRIMARY KEY("day","metric")
);
--> statement-breakpoint
CREATE TABLE "core"."report_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"frequency" text NOT NULL,
	"created_by" uuid NOT NULL,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."setting_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"reason" text,
	"proposed_by" uuid NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."report_schedules" ADD CONSTRAINT "report_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."setting_proposals" ADD CONSTRAINT "setting_proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."setting_proposals" ADD CONSTRAINT "setting_proposals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "setting_proposals_open" ON "core"."setting_proposals" USING btree ("decided_at");