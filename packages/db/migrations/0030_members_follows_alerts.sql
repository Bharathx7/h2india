CREATE TABLE "core"."alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"index_uid" text NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"channels" text[] DEFAULT '{email}'::text[] NOT NULL,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."follows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"label" text NOT NULL,
	"href" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."member_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"persona" text,
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"states" text[] DEFAULT '{}'::text[] NOT NULL,
	"onboarded_at" timestamp with time zone,
	"listed" boolean DEFAULT false NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."member_profiles" ADD CONSTRAINT "member_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_owner" ON "core"."alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alerts_index" ON "core"."alerts" USING btree ("index_uid","active");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_one" ON "core"."follows" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "follows_target" ON "core"."follows" USING btree ("target_type","target_id");