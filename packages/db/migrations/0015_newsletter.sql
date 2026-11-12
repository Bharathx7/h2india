CREATE TABLE "core"."newsletter_subscribers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"tender_digest" boolean DEFAULT false NOT NULL,
	"monthly_note" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"consent_version" text NOT NULL,
	"link_nonce" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_unique" ON "core"."newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_status_idx" ON "core"."newsletter_subscribers" USING btree ("status");