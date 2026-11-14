CREATE TABLE "core"."analytics_daily" (
	"organisation_id" uuid NOT NULL,
	"product_id" text DEFAULT '' NOT NULL,
	"day" date NOT NULL,
	"type" text NOT NULL,
	"viewer_state" text DEFAULT '' NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "analytics_daily_organisation_id_product_id_day_type_viewer_state_pk" PRIMARY KEY("organisation_id","product_id","day","type","viewer_state")
);
--> statement-breakpoint
CREATE TABLE "core"."analytics_events" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"product_id" uuid,
	"viewer_state" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."analytics_daily" ADD CONSTRAINT "analytics_daily_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."analytics_events" ADD CONSTRAINT "analytics_events_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_org" ON "core"."analytics_events" USING btree ("organisation_id","at");