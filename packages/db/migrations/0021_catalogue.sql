CREATE TABLE "core"."catalogue_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"short_label" text NOT NULL,
	"examples" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"hidden_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."catalogue_attributes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"unit" text,
	"min" double precision,
	"max" double precision,
	"options" text[] DEFAULT '{}'::text[] NOT NULL,
	"hint" text,
	"required" boolean DEFAULT false NOT NULL,
	"filterable" boolean DEFAULT false NOT NULL,
	"comparable" boolean DEFAULT false NOT NULL,
	"test_condition" text,
	"display_group" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."catalogue_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" text NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"hidden_at" timestamp with time zone,
	"sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."catalogue_category_applications" (
	"category_id" uuid NOT NULL,
	"application_id" text NOT NULL,
	CONSTRAINT "catalogue_category_applications_category_id_application_id_pk" PRIMARY KEY("category_id","application_id")
);
--> statement-breakpoint
CREATE TABLE "core"."catalogue_changes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL,
	"actor_id" uuid,
	"summary" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."catalogue_classes" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."catalogue_attributes" ADD CONSTRAINT "catalogue_attributes_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."catalogue_categories" ADD CONSTRAINT "catalogue_categories_class_id_catalogue_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "core"."catalogue_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."catalogue_categories" ADD CONSTRAINT "catalogue_categories_parent_id_catalogue_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."catalogue_category_applications" ADD CONSTRAINT "catalogue_category_applications_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."catalogue_category_applications" ADD CONSTRAINT "catalogue_category_applications_application_id_catalogue_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "core"."catalogue_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."catalogue_changes" ADD CONSTRAINT "catalogue_changes_category_id_catalogue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."catalogue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."catalogue_changes" ADD CONSTRAINT "catalogue_changes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalogue_attributes_key" ON "core"."catalogue_attributes" USING btree ("category_id","key") WHERE "core"."catalogue_attributes"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "catalogue_attributes_category" ON "core"."catalogue_attributes" USING btree ("category_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogue_categories_slug" ON "core"."catalogue_categories" USING btree ("class_id",coalesce("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),"slug") WHERE "core"."catalogue_categories"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "catalogue_categories_parent" ON "core"."catalogue_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "catalogue_changes_category" ON "core"."catalogue_changes" USING btree ("category_id","at");