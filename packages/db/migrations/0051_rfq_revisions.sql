CREATE TABLE "core"."rfq_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rfq_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"what_changed" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"changed_by" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."rfqs" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."rfq_revisions" ADD CONSTRAINT "rfq_revisions_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "core"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rfq_revisions" ADD CONSTRAINT "rfq_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_revisions_version" ON "core"."rfq_revisions" USING btree ("rfq_id","version");