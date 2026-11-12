CREATE TABLE "core"."notification_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"user_id" uuid,
	"recipient" text,
	"status" text NOT NULL,
	"reason" text,
	"provider" text,
	"provider_message_id" text,
	"provider_status" text,
	"error" text,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"send_after" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."notification_preferences" (
	"user_id" uuid NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"topic" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_scope_topic_channel_pk" PRIMARY KEY("user_id","scope","topic","channel")
);
--> statement-breakpoint
CREATE TABLE "core"."notification_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"quiet_hours" boolean DEFAULT false NOT NULL,
	"quiet_from" text DEFAULT '22:00' NOT NULL,
	"quiet_to" text DEFAULT '07:00' NOT NULL,
	"unsubscribed_all" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"event" text NOT NULL,
	"category" text NOT NULL,
	"icon" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"action_label" text,
	"visible_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."template_approvals" (
	"template" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"provider_template_id" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."template_approvals" ADD CONSTRAINT "template_approvals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliveries_due_idx" ON "core"."notification_deliveries" USING btree ("send_after") WHERE "core"."notification_deliveries"."status" IN ('Waiting', 'Failed');--> statement-breakpoint
CREATE INDEX "deliveries_user_idx" ON "core"."notification_deliveries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "core"."notifications" USING btree ("user_id","visible_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "core"."notifications" USING btree ("user_id") WHERE "core"."notifications"."read_at" IS NULL;