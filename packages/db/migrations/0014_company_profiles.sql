CREATE TABLE "core"."company_profiles" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"import_key" text,
	"trade_name" text NOT NULL,
	"types" text[] DEFAULT '{}'::text[] NOT NULL,
	"city" text,
	"website" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"summary" text,
	"founded_year" integer,
	"employees" text,
	"claim_status" text DEFAULT 'Claimed' NOT NULL,
	"sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "company_profiles_import_key_unique" UNIQUE("import_key")
);
--> statement-breakpoint
ALTER TABLE "core"."company_profiles" ADD CONSTRAINT "company_profiles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_profiles_claim_idx" ON "core"."company_profiles" USING btree ("claim_status");