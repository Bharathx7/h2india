CREATE TABLE "core"."dead_letters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"queue" text NOT NULL,
	"job_name" text NOT NULL,
	"job_id" text,
	"data" jsonb,
	"error" text NOT NULL,
	"stack" text,
	"attempts" integer NOT NULL,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolution" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."deadlines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"warn_at" timestamp with time zone,
	"due_at" timestamp with time zone NOT NULL,
	"warned_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."holidays" (
	"day" date PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."dead_letters" ADD CONSTRAINT "dead_letters_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."holidays" ADD CONSTRAINT "holidays_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dead_letters_open_idx" ON "core"."dead_letters" USING btree ("failed_at") WHERE "core"."dead_letters"."resolved_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "deadlines_one_open" ON "core"."deadlines" USING btree ("type","subject_type","subject_id") WHERE "core"."deadlines"."status" = 'Open';--> statement-breakpoint
CREATE INDEX "deadlines_due_idx" ON "core"."deadlines" USING btree ("due_at") WHERE "core"."deadlines"."status" = 'Open' AND "core"."deadlines"."expired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "deadlines_warn_idx" ON "core"."deadlines" USING btree ("warn_at") WHERE "core"."deadlines"."status" = 'Open' AND "core"."deadlines"."warned_at" IS NULL;--> statement-breakpoint
CREATE INDEX "deadlines_subject_idx" ON "core"."deadlines" USING btree ("subject_type","subject_id");