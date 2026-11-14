CREATE TABLE "core"."job_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"job_slug" text NOT NULL,
	"role" text NOT NULL,
	"company" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"closes_at" timestamp with time zone,
	"status" text DEFAULT 'Applied' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."learning_progress" (
	"user_id" uuid NOT NULL,
	"chapter_id" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"seconds_spent" integer DEFAULT 0 NOT NULL,
	"quiz" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	CONSTRAINT "learning_progress_user_id_chapter_id_pk" PRIMARY KEY("user_id","chapter_id")
);
--> statement-breakpoint
ALTER TABLE "core"."job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."learning_progress" ADD CONSTRAINT "learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_applications_once" ON "core"."job_applications" USING btree ("user_id","job_slug");--> statement-breakpoint
CREATE INDEX "job_applications_owner" ON "core"."job_applications" USING btree ("user_id");