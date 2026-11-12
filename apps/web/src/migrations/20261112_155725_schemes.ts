import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_schemes_benefit_types" AS ENUM('Capital subsidy', 'Production incentive', 'Viability gap funding', 'Grant', 'Tax or duty exemption');
  CREATE TYPE "cms"."enum_schemes_eligibility_rules_organisations" AS ENUM('producer', 'manufacturer', 'startup', 'research', 'industrial', 'state-agency', 'transport', 'other');
  CREATE TYPE "cms"."enum_schemes_eligibility_rules_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_schemes_eligibility_rules_activities" AS ENUM('production', 'electrolysers', 'fuel-cells', 'storage', 'refuelling', 'industry', 'research', 'services');
  CREATE TYPE "cms"."enum_schemes_eligibility_rules_sizes" AS ENUM('micro', 'small', 'medium', 'large');
  CREATE TYPE "cms"."enum_schemes_eligibility_rules_stages" AS ENUM('idea', 'pilot', 'first-plant', 'expanding');
  CREATE TYPE "cms"."enum__schemes_v_version_benefit_types" AS ENUM('Capital subsidy', 'Production incentive', 'Viability gap funding', 'Grant', 'Tax or duty exemption');
  CREATE TYPE "cms"."enum__schemes_v_version_eligibility_rules_organisations" AS ENUM('producer', 'manufacturer', 'startup', 'research', 'industrial', 'state-agency', 'transport', 'other');
  CREATE TYPE "cms"."enum__schemes_v_version_eligibility_rules_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__schemes_v_version_eligibility_rules_activities" AS ENUM('production', 'electrolysers', 'fuel-cells', 'storage', 'refuelling', 'industry', 'research', 'services');
  CREATE TYPE "cms"."enum__schemes_v_version_eligibility_rules_sizes" AS ENUM('micro', 'small', 'medium', 'large');
  CREATE TYPE "cms"."enum__schemes_v_version_eligibility_rules_stages" AS ENUM('idea', 'pilot', 'first-plant', 'expanding');
  CREATE TYPE "cms"."enum_tracker_policies_incentives_category" AS ENUM('Capital subsidy', 'Power and wheeling', 'Land', 'Electricity duty', 'Mobility support', 'Equipment buyers', 'Other');
  CREATE TYPE "cms"."enum__tracker_policies_v_version_incentives_category" AS ENUM('Capital subsidy', 'Power and wheeling', 'Land', 'Electricity duty', 'Mobility support', 'Equipment buyers', 'Other');
  CREATE TYPE "cms"."enum_sight_tracker_rounds_status" AS ENUM('Closing soon', 'Open', 'Announced', 'Results declared', 'Upcoming');
  CREATE TYPE "cms"."enum_sight_tracker_awardees_group" AS ENUM('Electrolysers', 'Green hydrogen', 'Green ammonia', 'Green methanol');
  CREATE TYPE "cms"."enum__sight_tracker_v_version_rounds_status" AS ENUM('Closing soon', 'Open', 'Announced', 'Results declared', 'Upcoming');
  CREATE TYPE "cms"."enum__sight_tracker_v_version_awardees_group" AS ENUM('Electrolysers', 'Green hydrogen', 'Green ammonia', 'Green methanol');
  CREATE TABLE "cms"."schemes_benefit_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_benefit_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_benefit_rates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "cms"."schemes_eligibility_rules_organisations" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_eligibility_rules_organisations",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_eligibility_rules_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_eligibility_rules_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_eligibility_rules_activities" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_eligibility_rules_activities",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_eligibility_rules_sizes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_eligibility_rules_sizes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_eligibility_rules_stages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_eligibility_rules_stages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_benefit_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_benefit_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_benefit_rates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_eligibility_rules_organisations" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_eligibility_rules_organisations",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_eligibility_rules_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_eligibility_rules_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_eligibility_rules_activities" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_eligibility_rules_activities",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_eligibility_rules_sizes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_eligibility_rules_sizes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_eligibility_rules_stages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_eligibility_rules_stages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."tracker_policies_incentives" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" "cms"."enum_tracker_policies_incentives_category",
  	"for" varchar,
  	"summary" varchar
  );
  
  CREATE TABLE "cms"."_tracker_policies_v_version_incentives" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "cms"."enum__tracker_policies_v_version_incentives_category",
  	"for" varchar,
  	"summary" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."sight_tracker_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."sight_tracker_rounds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"component" varchar NOT NULL,
  	"mode" varchar,
  	"tranche" varchar,
  	"product" varchar NOT NULL,
  	"offered" varchar,
  	"awarded" varchar,
  	"bid_due" varchar,
  	"result" varchar,
  	"status" "cms"."enum_sight_tracker_rounds_status" NOT NULL
  );
  
  CREATE TABLE "cms"."sight_tracker_awardees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"round" varchar NOT NULL,
  	"group" "cms"."enum_sight_tracker_awardees_group",
  	"capacity" varchar,
  	"price_or_incentive" varchar,
  	"profile_slug" varchar
  );
  
  CREATE TABLE "cms"."sight_tracker_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."sight_tracker" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro" varchar NOT NULL,
  	"verified_at" timestamp(3) with time zone,
  	"sources_line" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_sight_tracker_v_version_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_sight_tracker_v_version_rounds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"component" varchar NOT NULL,
  	"mode" varchar,
  	"tranche" varchar,
  	"product" varchar NOT NULL,
  	"offered" varchar,
  	"awarded" varchar,
  	"bid_due" varchar,
  	"result" varchar,
  	"status" "cms"."enum__sight_tracker_v_version_rounds_status" NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_sight_tracker_v_version_awardees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"round" varchar NOT NULL,
  	"group" "cms"."enum__sight_tracker_v_version_awardees_group",
  	"capacity" varchar,
  	"price_or_incentive" varchar,
  	"profile_slug" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_sight_tracker_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_sight_tracker_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_intro" varchar NOT NULL,
  	"version_verified_at" timestamp(3) with time zone,
  	"version_sources_line" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."schemes" ALTER COLUMN "status_override" SET DATA TYPE text;
  DROP TYPE "cms"."enum_schemes_status_override";
  CREATE TYPE "cms"."enum_schemes_status_override" AS ENUM('Announced', 'Results declared', 'Next round expected', 'Closed');
  ALTER TABLE "cms"."schemes" ALTER COLUMN "status_override" SET DATA TYPE "cms"."enum_schemes_status_override" USING "status_override"::"cms"."enum_schemes_status_override";
  ALTER TABLE "cms"."_schemes_v" ALTER COLUMN "version_status_override" SET DATA TYPE text;
  DROP TYPE "cms"."enum__schemes_v_version_status_override";
  CREATE TYPE "cms"."enum__schemes_v_version_status_override" AS ENUM('Announced', 'Results declared', 'Next round expected', 'Closed');
  ALTER TABLE "cms"."_schemes_v" ALTER COLUMN "version_status_override" SET DATA TYPE "cms"."enum__schemes_v_version_status_override" USING "version_status_override"::"cms"."enum__schemes_v_version_status_override";
  ALTER TABLE "cms"."schemes_tranches" ADD COLUMN "results_url" varchar;
  ALTER TABLE "cms"."schemes" ADD COLUMN "outlay" varchar;
  ALTER TABLE "cms"."schemes" ADD COLUMN "how_to_apply" varchar;
  ALTER TABLE "cms"."schemes" ADD COLUMN "eligibility_rules_checked" boolean;
  ALTER TABLE "cms"."schemes" ADD COLUMN "eligibility_rules_dpiit_only" boolean;
  ALTER TABLE "cms"."_schemes_v_version_tranches" ADD COLUMN "results_url" varchar;
  ALTER TABLE "cms"."_schemes_v" ADD COLUMN "version_outlay" varchar;
  ALTER TABLE "cms"."_schemes_v" ADD COLUMN "version_how_to_apply" varchar;
  ALTER TABLE "cms"."_schemes_v" ADD COLUMN "version_eligibility_rules_checked" boolean;
  ALTER TABLE "cms"."_schemes_v" ADD COLUMN "version_eligibility_rules_dpiit_only" boolean;
  ALTER TABLE "cms"."tenders_rels" ADD COLUMN "schemes_id" integer;
  ALTER TABLE "cms"."_tenders_v_rels" ADD COLUMN "schemes_id" integer;
  ALTER TABLE "cms"."tracker_policies" ADD COLUMN "summary" varchar;
  ALTER TABLE "cms"."tracker_policies" ADD COLUMN "nodal_agency_name" varchar;
  ALTER TABLE "cms"."tracker_policies" ADD COLUMN "nodal_agency_short" varchar;
  ALTER TABLE "cms"."tracker_policies" ADD COLUMN "nodal_agency_url" varchar;
  ALTER TABLE "cms"."_tracker_policies_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "cms"."_tracker_policies_v" ADD COLUMN "version_nodal_agency_name" varchar;
  ALTER TABLE "cms"."_tracker_policies_v" ADD COLUMN "version_nodal_agency_short" varchar;
  ALTER TABLE "cms"."_tracker_policies_v" ADD COLUMN "version_nodal_agency_url" varchar;
  ALTER TABLE "cms"."tracker_hubs" ADD COLUMN "status" varchar;
  ALTER TABLE "cms"."tracker_hubs" ADD COLUMN "lead" varchar;
  ALTER TABLE "cms"."tracker_hubs" ADD COLUMN "focus" varchar;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD COLUMN "version_status" varchar;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD COLUMN "version_lead" varchar;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD COLUMN "version_focus" varchar;
  ALTER TABLE "cms"."schemes_benefit_types" ADD CONSTRAINT "schemes_benefit_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_benefit_rates" ADD CONSTRAINT "schemes_benefit_rates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_eligibility_rules_organisations" ADD CONSTRAINT "schemes_eligibility_rules_organisations_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_eligibility_rules_states" ADD CONSTRAINT "schemes_eligibility_rules_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_eligibility_rules_activities" ADD CONSTRAINT "schemes_eligibility_rules_activities_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_eligibility_rules_sizes" ADD CONSTRAINT "schemes_eligibility_rules_sizes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_eligibility_rules_stages" ADD CONSTRAINT "schemes_eligibility_rules_stages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_texts" ADD CONSTRAINT "schemes_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_benefit_types" ADD CONSTRAINT "_schemes_v_version_benefit_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_benefit_rates" ADD CONSTRAINT "_schemes_v_version_benefit_rates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_organisations" ADD CONSTRAINT "_schemes_v_version_eligibility_rules_organisations_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_states" ADD CONSTRAINT "_schemes_v_version_eligibility_rules_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_activities" ADD CONSTRAINT "_schemes_v_version_eligibility_rules_activities_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_sizes" ADD CONSTRAINT "_schemes_v_version_eligibility_rules_sizes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_stages" ADD CONSTRAINT "_schemes_v_version_eligibility_rules_stages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_texts" ADD CONSTRAINT "_schemes_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_policies_incentives" ADD CONSTRAINT "tracker_policies_incentives_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_policies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_policies_v_version_incentives" ADD CONSTRAINT "_tracker_policies_v_version_incentives_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_policies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."sight_tracker_figures" ADD CONSTRAINT "sight_tracker_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."sight_tracker"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."sight_tracker_rounds" ADD CONSTRAINT "sight_tracker_rounds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."sight_tracker"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."sight_tracker_awardees" ADD CONSTRAINT "sight_tracker_awardees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."sight_tracker"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."sight_tracker_sources" ADD CONSTRAINT "sight_tracker_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."sight_tracker"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_sight_tracker_v_version_figures" ADD CONSTRAINT "_sight_tracker_v_version_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_sight_tracker_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_sight_tracker_v_version_rounds" ADD CONSTRAINT "_sight_tracker_v_version_rounds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_sight_tracker_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_sight_tracker_v_version_awardees" ADD CONSTRAINT "_sight_tracker_v_version_awardees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_sight_tracker_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_sight_tracker_v_version_sources" ADD CONSTRAINT "_sight_tracker_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_sight_tracker_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "schemes_benefit_types_order_idx" ON "cms"."schemes_benefit_types" USING btree ("order");
  CREATE INDEX "schemes_benefit_types_parent_idx" ON "cms"."schemes_benefit_types" USING btree ("parent_id");
  CREATE INDEX "schemes_benefit_rates_order_idx" ON "cms"."schemes_benefit_rates" USING btree ("_order");
  CREATE INDEX "schemes_benefit_rates_parent_id_idx" ON "cms"."schemes_benefit_rates" USING btree ("_parent_id");
  CREATE INDEX "schemes_eligibility_rules_organisations_order_idx" ON "cms"."schemes_eligibility_rules_organisations" USING btree ("order");
  CREATE INDEX "schemes_eligibility_rules_organisations_parent_idx" ON "cms"."schemes_eligibility_rules_organisations" USING btree ("parent_id");
  CREATE INDEX "schemes_eligibility_rules_states_order_idx" ON "cms"."schemes_eligibility_rules_states" USING btree ("order");
  CREATE INDEX "schemes_eligibility_rules_states_parent_idx" ON "cms"."schemes_eligibility_rules_states" USING btree ("parent_id");
  CREATE INDEX "schemes_eligibility_rules_activities_order_idx" ON "cms"."schemes_eligibility_rules_activities" USING btree ("order");
  CREATE INDEX "schemes_eligibility_rules_activities_parent_idx" ON "cms"."schemes_eligibility_rules_activities" USING btree ("parent_id");
  CREATE INDEX "schemes_eligibility_rules_sizes_order_idx" ON "cms"."schemes_eligibility_rules_sizes" USING btree ("order");
  CREATE INDEX "schemes_eligibility_rules_sizes_parent_idx" ON "cms"."schemes_eligibility_rules_sizes" USING btree ("parent_id");
  CREATE INDEX "schemes_eligibility_rules_stages_order_idx" ON "cms"."schemes_eligibility_rules_stages" USING btree ("order");
  CREATE INDEX "schemes_eligibility_rules_stages_parent_idx" ON "cms"."schemes_eligibility_rules_stages" USING btree ("parent_id");
  CREATE INDEX "schemes_texts_order_parent" ON "cms"."schemes_texts" USING btree ("order","parent_id");
  CREATE INDEX "_schemes_v_version_benefit_types_order_idx" ON "cms"."_schemes_v_version_benefit_types" USING btree ("order");
  CREATE INDEX "_schemes_v_version_benefit_types_parent_idx" ON "cms"."_schemes_v_version_benefit_types" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_benefit_rates_order_idx" ON "cms"."_schemes_v_version_benefit_rates" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_benefit_rates_parent_id_idx" ON "cms"."_schemes_v_version_benefit_rates" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_version_eligibility_rules_organisations_order_idx" ON "cms"."_schemes_v_version_eligibility_rules_organisations" USING btree ("order");
  CREATE INDEX "_schemes_v_version_eligibility_rules_organisations_parent_idx" ON "cms"."_schemes_v_version_eligibility_rules_organisations" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_eligibility_rules_states_order_idx" ON "cms"."_schemes_v_version_eligibility_rules_states" USING btree ("order");
  CREATE INDEX "_schemes_v_version_eligibility_rules_states_parent_idx" ON "cms"."_schemes_v_version_eligibility_rules_states" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_eligibility_rules_activities_order_idx" ON "cms"."_schemes_v_version_eligibility_rules_activities" USING btree ("order");
  CREATE INDEX "_schemes_v_version_eligibility_rules_activities_parent_idx" ON "cms"."_schemes_v_version_eligibility_rules_activities" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_eligibility_rules_sizes_order_idx" ON "cms"."_schemes_v_version_eligibility_rules_sizes" USING btree ("order");
  CREATE INDEX "_schemes_v_version_eligibility_rules_sizes_parent_idx" ON "cms"."_schemes_v_version_eligibility_rules_sizes" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_eligibility_rules_stages_order_idx" ON "cms"."_schemes_v_version_eligibility_rules_stages" USING btree ("order");
  CREATE INDEX "_schemes_v_version_eligibility_rules_stages_parent_idx" ON "cms"."_schemes_v_version_eligibility_rules_stages" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_texts_order_parent" ON "cms"."_schemes_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "tracker_policies_incentives_order_idx" ON "cms"."tracker_policies_incentives" USING btree ("_order");
  CREATE INDEX "tracker_policies_incentives_parent_id_idx" ON "cms"."tracker_policies_incentives" USING btree ("_parent_id");
  CREATE INDEX "_tracker_policies_v_version_incentives_order_idx" ON "cms"."_tracker_policies_v_version_incentives" USING btree ("_order");
  CREATE INDEX "_tracker_policies_v_version_incentives_parent_id_idx" ON "cms"."_tracker_policies_v_version_incentives" USING btree ("_parent_id");
  CREATE INDEX "sight_tracker_figures_order_idx" ON "cms"."sight_tracker_figures" USING btree ("_order");
  CREATE INDEX "sight_tracker_figures_parent_id_idx" ON "cms"."sight_tracker_figures" USING btree ("_parent_id");
  CREATE INDEX "sight_tracker_rounds_order_idx" ON "cms"."sight_tracker_rounds" USING btree ("_order");
  CREATE INDEX "sight_tracker_rounds_parent_id_idx" ON "cms"."sight_tracker_rounds" USING btree ("_parent_id");
  CREATE INDEX "sight_tracker_awardees_order_idx" ON "cms"."sight_tracker_awardees" USING btree ("_order");
  CREATE INDEX "sight_tracker_awardees_parent_id_idx" ON "cms"."sight_tracker_awardees" USING btree ("_parent_id");
  CREATE INDEX "sight_tracker_sources_order_idx" ON "cms"."sight_tracker_sources" USING btree ("_order");
  CREATE INDEX "sight_tracker_sources_parent_id_idx" ON "cms"."sight_tracker_sources" USING btree ("_parent_id");
  CREATE INDEX "_sight_tracker_v_version_figures_order_idx" ON "cms"."_sight_tracker_v_version_figures" USING btree ("_order");
  CREATE INDEX "_sight_tracker_v_version_figures_parent_id_idx" ON "cms"."_sight_tracker_v_version_figures" USING btree ("_parent_id");
  CREATE INDEX "_sight_tracker_v_version_rounds_order_idx" ON "cms"."_sight_tracker_v_version_rounds" USING btree ("_order");
  CREATE INDEX "_sight_tracker_v_version_rounds_parent_id_idx" ON "cms"."_sight_tracker_v_version_rounds" USING btree ("_parent_id");
  CREATE INDEX "_sight_tracker_v_version_awardees_order_idx" ON "cms"."_sight_tracker_v_version_awardees" USING btree ("_order");
  CREATE INDEX "_sight_tracker_v_version_awardees_parent_id_idx" ON "cms"."_sight_tracker_v_version_awardees" USING btree ("_parent_id");
  CREATE INDEX "_sight_tracker_v_version_sources_order_idx" ON "cms"."_sight_tracker_v_version_sources" USING btree ("_order");
  CREATE INDEX "_sight_tracker_v_version_sources_parent_id_idx" ON "cms"."_sight_tracker_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_sight_tracker_v_created_at_idx" ON "cms"."_sight_tracker_v" USING btree ("created_at");
  CREATE INDEX "_sight_tracker_v_updated_at_idx" ON "cms"."_sight_tracker_v" USING btree ("updated_at");
  ALTER TABLE "cms"."tenders_rels" ADD CONSTRAINT "tenders_rels_schemes_fk" FOREIGN KEY ("schemes_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_rels" ADD CONSTRAINT "_tenders_v_rels_schemes_fk" FOREIGN KEY ("schemes_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tenders_rels_schemes_id_idx" ON "cms"."tenders_rels" USING btree ("schemes_id");
  CREATE INDEX "_tenders_v_rels_schemes_id_idx" ON "cms"."_tenders_v_rels" USING btree ("schemes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."schemes_benefit_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_benefit_rates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_eligibility_rules_organisations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_eligibility_rules_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_eligibility_rules_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_eligibility_rules_sizes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_eligibility_rules_stages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_benefit_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_benefit_rates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_organisations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_activities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_sizes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_eligibility_rules_stages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_policies_incentives" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_policies_v_version_incentives" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sight_tracker_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sight_tracker_rounds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sight_tracker_awardees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sight_tracker_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sight_tracker" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sight_tracker_v_version_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sight_tracker_v_version_rounds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sight_tracker_v_version_awardees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sight_tracker_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sight_tracker_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."schemes_benefit_types" CASCADE;
  DROP TABLE "cms"."schemes_benefit_rates" CASCADE;
  DROP TABLE "cms"."schemes_eligibility_rules_organisations" CASCADE;
  DROP TABLE "cms"."schemes_eligibility_rules_states" CASCADE;
  DROP TABLE "cms"."schemes_eligibility_rules_activities" CASCADE;
  DROP TABLE "cms"."schemes_eligibility_rules_sizes" CASCADE;
  DROP TABLE "cms"."schemes_eligibility_rules_stages" CASCADE;
  DROP TABLE "cms"."schemes_texts" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_benefit_types" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_benefit_rates" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_eligibility_rules_organisations" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_eligibility_rules_states" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_eligibility_rules_activities" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_eligibility_rules_sizes" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_eligibility_rules_stages" CASCADE;
  DROP TABLE "cms"."_schemes_v_texts" CASCADE;
  DROP TABLE "cms"."tracker_policies_incentives" CASCADE;
  DROP TABLE "cms"."_tracker_policies_v_version_incentives" CASCADE;
  DROP TABLE "cms"."sight_tracker_figures" CASCADE;
  DROP TABLE "cms"."sight_tracker_rounds" CASCADE;
  DROP TABLE "cms"."sight_tracker_awardees" CASCADE;
  DROP TABLE "cms"."sight_tracker_sources" CASCADE;
  DROP TABLE "cms"."sight_tracker" CASCADE;
  DROP TABLE "cms"."_sight_tracker_v_version_figures" CASCADE;
  DROP TABLE "cms"."_sight_tracker_v_version_rounds" CASCADE;
  DROP TABLE "cms"."_sight_tracker_v_version_awardees" CASCADE;
  DROP TABLE "cms"."_sight_tracker_v_version_sources" CASCADE;
  DROP TABLE "cms"."_sight_tracker_v" CASCADE;
  ALTER TABLE "cms"."tenders_rels" DROP CONSTRAINT "tenders_rels_schemes_fk";
  
  ALTER TABLE "cms"."_tenders_v_rels" DROP CONSTRAINT "_tenders_v_rels_schemes_fk";
  
  ALTER TABLE "cms"."schemes" ALTER COLUMN "status_override" SET DATA TYPE text;
  DROP TYPE "cms"."enum_schemes_status_override";
  CREATE TYPE "cms"."enum_schemes_status_override" AS ENUM('Closed', 'Next round expected');
  ALTER TABLE "cms"."schemes" ALTER COLUMN "status_override" SET DATA TYPE "cms"."enum_schemes_status_override" USING "status_override"::"cms"."enum_schemes_status_override";
  ALTER TABLE "cms"."_schemes_v" ALTER COLUMN "version_status_override" SET DATA TYPE text;
  DROP TYPE "cms"."enum__schemes_v_version_status_override";
  CREATE TYPE "cms"."enum__schemes_v_version_status_override" AS ENUM('Closed', 'Next round expected');
  ALTER TABLE "cms"."_schemes_v" ALTER COLUMN "version_status_override" SET DATA TYPE "cms"."enum__schemes_v_version_status_override" USING "version_status_override"::"cms"."enum__schemes_v_version_status_override";
  DROP INDEX "cms"."tenders_rels_schemes_id_idx";
  DROP INDEX "cms"."_tenders_v_rels_schemes_id_idx";
  ALTER TABLE "cms"."schemes_tranches" DROP COLUMN "results_url";
  ALTER TABLE "cms"."schemes" DROP COLUMN "outlay";
  ALTER TABLE "cms"."schemes" DROP COLUMN "how_to_apply";
  ALTER TABLE "cms"."schemes" DROP COLUMN "eligibility_rules_checked";
  ALTER TABLE "cms"."schemes" DROP COLUMN "eligibility_rules_dpiit_only";
  ALTER TABLE "cms"."_schemes_v_version_tranches" DROP COLUMN "results_url";
  ALTER TABLE "cms"."_schemes_v" DROP COLUMN "version_outlay";
  ALTER TABLE "cms"."_schemes_v" DROP COLUMN "version_how_to_apply";
  ALTER TABLE "cms"."_schemes_v" DROP COLUMN "version_eligibility_rules_checked";
  ALTER TABLE "cms"."_schemes_v" DROP COLUMN "version_eligibility_rules_dpiit_only";
  ALTER TABLE "cms"."tenders_rels" DROP COLUMN "schemes_id";
  ALTER TABLE "cms"."_tenders_v_rels" DROP COLUMN "schemes_id";
  ALTER TABLE "cms"."tracker_policies" DROP COLUMN "summary";
  ALTER TABLE "cms"."tracker_policies" DROP COLUMN "nodal_agency_name";
  ALTER TABLE "cms"."tracker_policies" DROP COLUMN "nodal_agency_short";
  ALTER TABLE "cms"."tracker_policies" DROP COLUMN "nodal_agency_url";
  ALTER TABLE "cms"."_tracker_policies_v" DROP COLUMN "version_summary";
  ALTER TABLE "cms"."_tracker_policies_v" DROP COLUMN "version_nodal_agency_name";
  ALTER TABLE "cms"."_tracker_policies_v" DROP COLUMN "version_nodal_agency_short";
  ALTER TABLE "cms"."_tracker_policies_v" DROP COLUMN "version_nodal_agency_url";
  ALTER TABLE "cms"."tracker_hubs" DROP COLUMN "status";
  ALTER TABLE "cms"."tracker_hubs" DROP COLUMN "lead";
  ALTER TABLE "cms"."tracker_hubs" DROP COLUMN "focus";
  ALTER TABLE "cms"."_tracker_hubs_v" DROP COLUMN "version_status";
  ALTER TABLE "cms"."_tracker_hubs_v" DROP COLUMN "version_lead";
  ALTER TABLE "cms"."_tracker_hubs_v" DROP COLUMN "version_focus";
  DROP TYPE "cms"."enum_schemes_benefit_types";
  DROP TYPE "cms"."enum_schemes_eligibility_rules_organisations";
  DROP TYPE "cms"."enum_schemes_eligibility_rules_states";
  DROP TYPE "cms"."enum_schemes_eligibility_rules_activities";
  DROP TYPE "cms"."enum_schemes_eligibility_rules_sizes";
  DROP TYPE "cms"."enum_schemes_eligibility_rules_stages";
  DROP TYPE "cms"."enum__schemes_v_version_benefit_types";
  DROP TYPE "cms"."enum__schemes_v_version_eligibility_rules_organisations";
  DROP TYPE "cms"."enum__schemes_v_version_eligibility_rules_states";
  DROP TYPE "cms"."enum__schemes_v_version_eligibility_rules_activities";
  DROP TYPE "cms"."enum__schemes_v_version_eligibility_rules_sizes";
  DROP TYPE "cms"."enum__schemes_v_version_eligibility_rules_stages";
  DROP TYPE "cms"."enum_tracker_policies_incentives_category";
  DROP TYPE "cms"."enum__tracker_policies_v_version_incentives_category";
  DROP TYPE "cms"."enum_sight_tracker_rounds_status";
  DROP TYPE "cms"."enum_sight_tracker_awardees_group";
  DROP TYPE "cms"."enum__sight_tracker_v_version_rounds_status";
  DROP TYPE "cms"."enum__sight_tracker_v_version_awardees_group";`)
}
