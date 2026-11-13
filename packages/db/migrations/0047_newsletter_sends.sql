CREATE TABLE "core"."newsletter_deliveries" (
	"send_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_deliveries_send_id_subscriber_id_pk" PRIMARY KEY("send_id","subscriber_id")
);
--> statement-breakpoint
CREATE TABLE "core"."newsletter_sends" (
	"id" uuid PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"preview" text DEFAULT '' NOT NULL,
	"editor_note" text DEFAULT '' NOT NULL,
	"segment" text DEFAULT 'all' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"send_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered" integer DEFAULT 0 NOT NULL,
	"opens" integer,
	"clicks" integer,
	"last_test_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_sends_issue_id_unique" UNIQUE("issue_id")
);
--> statement-breakpoint
ALTER TABLE "core"."newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_send_id_newsletter_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "core"."newsletter_sends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_subscriber_id_newsletter_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "core"."newsletter_subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."newsletter_sends" ADD CONSTRAINT "newsletter_sends_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;