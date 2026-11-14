CREATE TABLE "core"."webinar_registrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"event_slug" text NOT NULL,
	"kind" text DEFAULT 'live' NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"organisation" text,
	"role" text,
	"mobile" text,
	"sponsor_consent" boolean DEFAULT false NOT NULL,
	"consent_text" text,
	"consent_version" text,
	"day_reminder_at" timestamp with time zone,
	"hour_reminder_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "core"."webinar_registrations" ADD CONSTRAINT "webinar_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webinar_registrations_event_email" ON "core"."webinar_registrations" USING btree ("event_id",lower("email"));--> statement-breakpoint
CREATE INDEX "webinar_registrations_event_kind" ON "core"."webinar_registrations" USING btree ("event_id","kind");