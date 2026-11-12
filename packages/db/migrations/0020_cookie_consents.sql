CREATE TABLE "core"."cookie_consents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"browser_id" text NOT NULL,
	"version" text NOT NULL,
	"analytics" boolean NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cookie_consents_browser_idx" ON "core"."cookie_consents" USING btree ("browser_id","created_at");