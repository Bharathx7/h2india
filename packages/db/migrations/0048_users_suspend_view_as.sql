CREATE TABLE "core"."view_as_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"operator_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "view_as_grants_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."users" ADD COLUMN "suspend_reason" text;--> statement-breakpoint
ALTER TABLE "core"."organisations" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."organisations" ADD COLUMN "suspend_reason" text;--> statement-breakpoint
ALTER TABLE "core"."view_as_grants" ADD CONSTRAINT "view_as_grants_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."view_as_grants" ADD CONSTRAINT "view_as_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "view_as_grants_operator" ON "core"."view_as_grants" USING btree ("operator_id","created_at");