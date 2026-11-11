CREATE SCHEMA IF NOT EXISTS "core";
--> statement-breakpoint
-- The content system (Payload) keeps its own tables in the cms schema (ADR 0002).
CREATE SCHEMA IF NOT EXISTS "cms";
--> statement-breakpoint
CREATE TABLE "core"."audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"acting_as_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"company_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"ip" text,
	"user_agent" text,
	"request_id" text
);
--> statement-breakpoint
CREATE TABLE "core"."reference_sequences" (
	"type" text NOT NULL,
	"year" integer NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "reference_sequences_type_year_pk" PRIMARY KEY("type","year")
);
--> statement-breakpoint
CREATE TABLE "core"."status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"metadata" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "core"."audit_log" USING btree ("resource_type","resource_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "core"."audit_log" USING btree ("actor_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_company_idx" ON "core"."audit_log" USING btree ("company_id","at");--> statement-breakpoint
CREATE INDEX "status_history_entity_idx" ON "core"."status_history" USING btree ("entity_type","entity_id","at");