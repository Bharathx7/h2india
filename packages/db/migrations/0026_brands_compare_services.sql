CREATE TABLE "core"."brand_dealers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"regions" text,
	"scope" text,
	"letter_valid_until" date,
	"evidence_file_id" text,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."brands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"origin" text NOT NULL,
	"owner_name" text,
	"owner_url" text,
	"description" text,
	"sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."compare_lists" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"product_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "brand_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."products" ADD COLUMN "service" jsonb;--> statement-breakpoint
ALTER TABLE "core"."brand_dealers" ADD CONSTRAINT "brand_dealers_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "core"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."brand_dealers" ADD CONSTRAINT "brand_dealers_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."brand_dealers" ADD CONSTRAINT "brand_dealers_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."compare_lists" ADD CONSTRAINT "compare_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_dealers_pair" ON "core"."brand_dealers" USING btree ("brand_id","organisation_id");--> statement-breakpoint
CREATE INDEX "brand_dealers_org" ON "core"."brand_dealers" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug" ON "core"."brands" USING btree ("slug") WHERE "core"."brands"."deleted_at" is null;