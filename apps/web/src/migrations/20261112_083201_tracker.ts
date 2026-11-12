import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_tracker_projects_status_history_status" AS ENUM('Announced', 'Awarded', 'Contracted', 'Under construction', 'Commissioned', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_projects_estimates" AS ENUM('Hydrogen capacity', 'Product capacity', 'Electrolysers', 'Expected start-up');
  CREATE TYPE "cms"."enum_tracker_projects_product" AS ENUM('Green hydrogen', 'Green ammonia', 'Green methanol', 'Other');
  CREATE TYPE "cms"."enum_tracker_projects_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_projects_technology" AS ENUM('Alkaline', 'PEM', 'SOEC', 'AEM', 'PEM fuel cell', 'Other');
  CREATE TYPE "cms"."enum_tracker_projects_stage" AS ENUM('Announced', 'Awarded', 'Contracted', 'Under construction', 'Commissioned', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_projects_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_projects_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_status_history_status" AS ENUM('Announced', 'Awarded', 'Contracted', 'Under construction', 'Commissioned', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_estimates" AS ENUM('Hydrogen capacity', 'Product capacity', 'Electrolysers', 'Expected start-up');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_product" AS ENUM('Green hydrogen', 'Green ammonia', 'Green methanol', 'Other');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_technology" AS ENUM('Alkaline', 'PEM', 'SOEC', 'AEM', 'PEM fuel cell', 'Other');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_stage" AS ENUM('Announced', 'Awarded', 'Contracted', 'Under construction', 'Commissioned', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tracker_factories_status_history_status" AS ENUM('Announced', 'Awarded', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_factories_estimates" AS ENUM('Capacity');
  CREATE TYPE "cms"."enum_tracker_factories_product" AS ENUM('Electrolyser', 'Electrolyser stack', 'Fuel cell', 'Other');
  CREATE TYPE "cms"."enum_tracker_factories_technology" AS ENUM('Alkaline', 'PEM', 'SOEC', 'AEM', 'PEM fuel cell', 'Other');
  CREATE TYPE "cms"."enum_tracker_factories_tranche" AS ENUM('SIGHT Tranche I', 'SIGHT Tranche II', 'SIGHT Tranche III', 'Not under SIGHT');
  CREATE TYPE "cms"."enum_tracker_factories_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_factories_stage" AS ENUM('Announced', 'Awarded', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_factories_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_factories_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_status_history_status" AS ENUM('Announced', 'Awarded', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_estimates" AS ENUM('Capacity');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_product" AS ENUM('Electrolyser', 'Electrolyser stack', 'Fuel cell', 'Other');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_technology" AS ENUM('Alkaline', 'PEM', 'SOEC', 'AEM', 'PEM fuel cell', 'Other');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_tranche" AS ENUM('SIGHT Tranche I', 'SIGHT Tranche II', 'SIGHT Tranche III', 'Not under SIGHT');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_stage" AS ENUM('Announced', 'Awarded', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_factories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tracker_pilots_status_history_status" AS ENUM('Planned', 'Under construction', 'Running', 'Completed', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_pilots_estimates" AS ENUM('Vehicles or units');
  CREATE TYPE "cms"."enum_tracker_pilots_sector" AS ENUM('Mobility', 'Steel', 'Shipping', 'Other');
  CREATE TYPE "cms"."enum_tracker_pilots_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_pilots_stage" AS ENUM('Planned', 'Under construction', 'Running', 'Completed', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_pilots_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_pilots_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_status_history_status" AS ENUM('Planned', 'Under construction', 'Running', 'Completed', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_estimates" AS ENUM('Vehicles or units');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_sector" AS ENUM('Mobility', 'Steel', 'Shipping', 'Other');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_stage" AS ENUM('Planned', 'Under construction', 'Running', 'Completed', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_pilots_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tracker_stations_status_history_status" AS ENUM('Planned', 'Tender open', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_stations_estimates" AS ENUM('Capacity');
  CREATE TYPE "cms"."enum_tracker_stations_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_stations_stage" AS ENUM('Planned', 'Tender open', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum_tracker_stations_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_stations_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_stations_v_version_status_history_status" AS ENUM('Planned', 'Tender open', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_stations_v_version_estimates" AS ENUM('Capacity');
  CREATE TYPE "cms"."enum__tracker_stations_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_stations_v_version_stage" AS ENUM('Planned', 'Tender open', 'Under construction', 'Operating', 'Cancelled');
  CREATE TYPE "cms"."enum__tracker_stations_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_stations_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tracker_prices_product" AS ENUM('Green H₂', 'Green NH₃', 'Methanol', 'Other');
  CREATE TYPE "cms"."enum_tracker_prices_gst_basis" AS ENUM('Excl. GST', 'Incl. GST');
  CREATE TYPE "cms"."enum_tracker_prices_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_prices_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_prices_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_prices_v_version_product" AS ENUM('Green H₂', 'Green NH₃', 'Methanol', 'Other');
  CREATE TYPE "cms"."enum__tracker_prices_v_version_gst_basis" AS ENUM('Excl. GST', 'Incl. GST');
  CREATE TYPE "cms"."enum__tracker_prices_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_prices_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_prices_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tracker_policies_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_policies_type" AS ENUM('Dedicated', 'Provisions');
  CREATE TYPE "cms"."enum_tracker_policies_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_policies_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_policies_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_policies_v_version_type" AS ENUM('Dedicated', 'Provisions');
  CREATE TYPE "cms"."enum__tracker_policies_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_policies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tracker_hubs_kind" AS ENUM('Hub', 'Valley');
  CREATE TYPE "cms"."enum_tracker_hubs_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tracker_hubs_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum_tracker_hubs_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tracker_hubs_v_version_kind" AS ENUM('Hub', 'Valley');
  CREATE TYPE "cms"."enum__tracker_hubs_v_version_state" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tracker_hubs_v_version_source_tier" AS ENUM('official', 'filing', 'company', 'press');
  CREATE TYPE "cms"."enum__tracker_hubs_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."tracker_projects_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "cms"."tracker_projects_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "cms"."enum_tracker_projects_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar
  );
  
  CREATE TABLE "cms"."tracker_projects_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_tracker_projects_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"company" varchar,
  	"product" "cms"."enum_tracker_projects_product" DEFAULT 'Green hydrogen',
  	"location" varchar,
  	"state" "cms"."enum_tracker_projects_state",
  	"latitude" numeric,
  	"longitude" numeric,
  	"capacity_tpa" numeric,
  	"product_capacity_tpa" numeric,
  	"electrolyser_mw" numeric,
  	"technology" "cms"."enum_tracker_projects_technology",
  	"renewable_power" varchar,
  	"scheme" varchar,
  	"under_sight" boolean DEFAULT false,
  	"expected_start_year" numeric,
  	"slug" varchar,
  	"stage" "cms"."enum_tracker_projects_stage",
  	"status_date" timestamp(3) with time zone,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_projects_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_projects_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."tracker_projects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."_tracker_projects_v_version_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_projects_v_version_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "cms"."enum__tracker_projects_v_version_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_projects_v_version_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__tracker_projects_v_version_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_tracker_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_company" varchar,
  	"version_product" "cms"."enum__tracker_projects_v_version_product" DEFAULT 'Green hydrogen',
  	"version_location" varchar,
  	"version_state" "cms"."enum__tracker_projects_v_version_state",
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_capacity_tpa" numeric,
  	"version_product_capacity_tpa" numeric,
  	"version_electrolyser_mw" numeric,
  	"version_technology" "cms"."enum__tracker_projects_v_version_technology",
  	"version_renewable_power" varchar,
  	"version_scheme" varchar,
  	"version_under_sight" boolean DEFAULT false,
  	"version_expected_start_year" numeric,
  	"version_slug" varchar,
  	"version_stage" "cms"."enum__tracker_projects_v_version_stage",
  	"version_status_date" timestamp(3) with time zone,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_projects_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_tracker_projects_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."tracker_factories_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "cms"."tracker_factories_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "cms"."enum_tracker_factories_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar
  );
  
  CREATE TABLE "cms"."tracker_factories_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_tracker_factories_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_factories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"company" varchar,
  	"product" "cms"."enum_tracker_factories_product" DEFAULT 'Electrolyser',
  	"capacity_mw_per_year" numeric,
  	"technology" "cms"."enum_tracker_factories_technology",
  	"tranche" "cms"."enum_tracker_factories_tranche" DEFAULT 'Not under SIGHT',
  	"location" varchar,
  	"state" "cms"."enum_tracker_factories_state",
  	"latitude" numeric,
  	"longitude" numeric,
  	"slug" varchar,
  	"stage" "cms"."enum_tracker_factories_stage",
  	"status_date" timestamp(3) with time zone,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_factories_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_factories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."tracker_factories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."_tracker_factories_v_version_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_factories_v_version_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "cms"."enum__tracker_factories_v_version_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_factories_v_version_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__tracker_factories_v_version_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_tracker_factories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_company" varchar,
  	"version_product" "cms"."enum__tracker_factories_v_version_product" DEFAULT 'Electrolyser',
  	"version_capacity_mw_per_year" numeric,
  	"version_technology" "cms"."enum__tracker_factories_v_version_technology",
  	"version_tranche" "cms"."enum__tracker_factories_v_version_tranche" DEFAULT 'Not under SIGHT',
  	"version_location" varchar,
  	"version_state" "cms"."enum__tracker_factories_v_version_state",
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_slug" varchar,
  	"version_stage" "cms"."enum__tracker_factories_v_version_stage",
  	"version_status_date" timestamp(3) with time zone,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_factories_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_factories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_tracker_factories_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."tracker_pilots_route" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"latitude" numeric,
  	"longitude" numeric
  );
  
  CREATE TABLE "cms"."tracker_pilots_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "cms"."tracker_pilots_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "cms"."enum_tracker_pilots_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar
  );
  
  CREATE TABLE "cms"."tracker_pilots_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_tracker_pilots_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_pilots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"sector" "cms"."enum_tracker_pilots_sector",
  	"lead_partner" varchar,
  	"route_or_site" varchar,
  	"units" varchar,
  	"vehicles" numeric,
  	"funding" varchar,
  	"location" varchar,
  	"state" "cms"."enum_tracker_pilots_state",
  	"latitude" numeric,
  	"longitude" numeric,
  	"slug" varchar,
  	"stage" "cms"."enum_tracker_pilots_stage",
  	"status_date" timestamp(3) with time zone,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_pilots_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_pilots_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."tracker_pilots_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."_tracker_pilots_v_version_route" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"latitude" numeric,
  	"longitude" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_pilots_v_version_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_pilots_v_version_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "cms"."enum__tracker_pilots_v_version_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_pilots_v_version_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__tracker_pilots_v_version_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_tracker_pilots_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_sector" "cms"."enum__tracker_pilots_v_version_sector",
  	"version_lead_partner" varchar,
  	"version_route_or_site" varchar,
  	"version_units" varchar,
  	"version_vehicles" numeric,
  	"version_funding" varchar,
  	"version_location" varchar,
  	"version_state" "cms"."enum__tracker_pilots_v_version_state",
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_slug" varchar,
  	"version_stage" "cms"."enum__tracker_pilots_v_version_stage",
  	"version_status_date" timestamp(3) with time zone,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_pilots_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_pilots_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_tracker_pilots_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."tracker_stations_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "cms"."tracker_stations_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "cms"."enum_tracker_stations_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar
  );
  
  CREATE TABLE "cms"."tracker_stations_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_tracker_stations_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_stations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"operator" varchar,
  	"capacity_kg_per_day" numeric,
  	"vehicles_served" varchar,
  	"closing_date" timestamp(3) with time zone,
  	"location" varchar,
  	"state" "cms"."enum_tracker_stations_state",
  	"latitude" numeric,
  	"longitude" numeric,
  	"slug" varchar,
  	"stage" "cms"."enum_tracker_stations_stage",
  	"status_date" timestamp(3) with time zone,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_stations_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_stations_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."tracker_stations_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_stations_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."_tracker_stations_v_version_linked_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_stations_v_version_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "cms"."enum__tracker_stations_v_version_status_history_status",
  	"date" timestamp(3) with time zone,
  	"source" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_stations_v_version_estimates" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__tracker_stations_v_version_estimates",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_tracker_stations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_operator" varchar,
  	"version_capacity_kg_per_day" numeric,
  	"version_vehicles_served" varchar,
  	"version_closing_date" timestamp(3) with time zone,
  	"version_location" varchar,
  	"version_state" "cms"."enum__tracker_stations_v_version_state",
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_slug" varchar,
  	"version_stage" "cms"."enum__tracker_stations_v_version_stage",
  	"version_status_date" timestamp(3) with time zone,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_stations_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_stations_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_tracker_stations_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."_tracker_stations_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."tracker_prices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"product" "cms"."enum_tracker_prices_product",
  	"price" varchar,
  	"gst_basis" "cms"."enum_tracker_prices_gst_basis" DEFAULT 'Excl. GST',
  	"price_paise" numeric,
  	"discovered_on" timestamp(3) with time zone,
  	"winner" varchar,
  	"buyer" varchar,
  	"state" "cms"."enum_tracker_prices_state",
  	"slug" varchar,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_prices_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_prices_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."tracker_prices_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."_tracker_prices_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_product" "cms"."enum__tracker_prices_v_version_product",
  	"version_price" varchar,
  	"version_gst_basis" "cms"."enum__tracker_prices_v_version_gst_basis" DEFAULT 'Excl. GST',
  	"version_price_paise" numeric,
  	"version_discovered_on" timestamp(3) with time zone,
  	"version_winner" varchar,
  	"version_buyer" varchar,
  	"version_state" "cms"."enum__tracker_prices_v_version_state",
  	"version_slug" varchar,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_prices_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_prices_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_tracker_prices_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "cms"."tracker_policies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"state" "cms"."enum_tracker_policies_state",
  	"name" varchar,
  	"policy" varchar,
  	"type" "cms"."enum_tracker_policies_type",
  	"year" numeric,
  	"key_incentives" varchar,
  	"official_url" varchar,
  	"scheme_id" integer,
  	"slug" varchar,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_policies_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_policies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_tracker_policies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_state" "cms"."enum__tracker_policies_v_version_state",
  	"version_name" varchar,
  	"version_policy" varchar,
  	"version_type" "cms"."enum__tracker_policies_v_version_type",
  	"version_year" numeric,
  	"version_key_incentives" varchar,
  	"version_official_url" varchar,
  	"version_scheme_id" integer,
  	"version_slug" varchar,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_policies_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_policies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."tracker_hubs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"kind" "cms"."enum_tracker_hubs_kind",
  	"description" varchar,
  	"location" varchar,
  	"state" "cms"."enum_tracker_hubs_state",
  	"latitude" numeric,
  	"longitude" numeric,
  	"slug" varchar,
  	"source_name" varchar,
  	"source_url" varchar,
  	"source_tier" "cms"."enum_tracker_hubs_source_tier",
  	"source_as_of" timestamp(3) with time zone,
  	"owner_id" integer,
  	"entered_by_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tracker_hubs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_tracker_hubs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_kind" "cms"."enum__tracker_hubs_v_version_kind",
  	"version_description" varchar,
  	"version_location" varchar,
  	"version_state" "cms"."enum__tracker_hubs_v_version_state",
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_slug" varchar,
  	"version_source_name" varchar,
  	"version_source_url" varchar,
  	"version_source_tier" "cms"."enum__tracker_hubs_v_version_source_tier",
  	"version_source_as_of" timestamp(3) with time zone,
  	"version_owner_id" integer,
  	"version_entered_by_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tracker_hubs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."tracker_changes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"record_title" varchar NOT NULL,
  	"record_slug" varchar,
  	"view" varchar NOT NULL,
  	"field" varchar NOT NULL,
  	"before" varchar,
  	"after" varchar,
  	"source" varchar,
  	"source_url" varchar,
  	"changed_by_id" integer,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_changes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tracker_projects_id" integer,
  	"tracker_factories_id" integer,
  	"tracker_pilots_id" integer,
  	"tracker_stations_id" integer,
  	"tracker_prices_id" integer,
  	"tracker_policies_id" integer,
  	"tracker_hubs_id" integer
  );
  
  CREATE TABLE "cms"."tracker_methodology_status_meanings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" varchar NOT NULL,
  	"meaning" varchar NOT NULL,
  	"evidence" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_methodology_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_methodology_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."tracker_methodology" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"update_note" varchar DEFAULT 'Every Monday. Errors we find or are told about are fixed within 1 working day and logged in Recent changes.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_tracker_methodology_v_version_status_meanings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" varchar NOT NULL,
  	"meaning" varchar NOT NULL,
  	"evidence" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_methodology_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_methodology_v_version_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tracker_methodology_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_update_note" varchar DEFAULT 'Every Monday. Errors we find or are told about are fixed within 1 working day and logged in Recent changes.',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_projects_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_factories_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_pilots_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_stations_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_prices_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_policies_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_hubs_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tracker_changes_id" integer;
  ALTER TABLE "cms"."tracker_projects_linked_companies" ADD CONSTRAINT "tracker_projects_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects_status_history" ADD CONSTRAINT "tracker_projects_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects_estimates" ADD CONSTRAINT "tracker_projects_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects" ADD CONSTRAINT "tracker_projects_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects" ADD CONSTRAINT "tracker_projects_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects" ADD CONSTRAINT "tracker_projects_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects_rels" ADD CONSTRAINT "tracker_projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_projects_rels" ADD CONSTRAINT "tracker_projects_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v_version_linked_companies" ADD CONSTRAINT "_tracker_projects_v_version_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v_version_status_history" ADD CONSTRAINT "_tracker_projects_v_version_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v_version_estimates" ADD CONSTRAINT "_tracker_projects_v_version_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v" ADD CONSTRAINT "_tracker_projects_v_parent_id_tracker_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v" ADD CONSTRAINT "_tracker_projects_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v" ADD CONSTRAINT "_tracker_projects_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v" ADD CONSTRAINT "_tracker_projects_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v_rels" ADD CONSTRAINT "_tracker_projects_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_projects_v_rels" ADD CONSTRAINT "_tracker_projects_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories_linked_companies" ADD CONSTRAINT "tracker_factories_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories_status_history" ADD CONSTRAINT "tracker_factories_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories_estimates" ADD CONSTRAINT "tracker_factories_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories" ADD CONSTRAINT "tracker_factories_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories" ADD CONSTRAINT "tracker_factories_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories" ADD CONSTRAINT "tracker_factories_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories_rels" ADD CONSTRAINT "tracker_factories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_factories_rels" ADD CONSTRAINT "tracker_factories_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v_version_linked_companies" ADD CONSTRAINT "_tracker_factories_v_version_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_factories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v_version_status_history" ADD CONSTRAINT "_tracker_factories_v_version_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_factories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v_version_estimates" ADD CONSTRAINT "_tracker_factories_v_version_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_factories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v" ADD CONSTRAINT "_tracker_factories_v_parent_id_tracker_factories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v" ADD CONSTRAINT "_tracker_factories_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v" ADD CONSTRAINT "_tracker_factories_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v" ADD CONSTRAINT "_tracker_factories_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v_rels" ADD CONSTRAINT "_tracker_factories_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_factories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_factories_v_rels" ADD CONSTRAINT "_tracker_factories_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots_route" ADD CONSTRAINT "tracker_pilots_route_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots_linked_companies" ADD CONSTRAINT "tracker_pilots_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots_status_history" ADD CONSTRAINT "tracker_pilots_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots_estimates" ADD CONSTRAINT "tracker_pilots_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots" ADD CONSTRAINT "tracker_pilots_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots" ADD CONSTRAINT "tracker_pilots_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots" ADD CONSTRAINT "tracker_pilots_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots_rels" ADD CONSTRAINT "tracker_pilots_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_pilots_rels" ADD CONSTRAINT "tracker_pilots_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v_version_route" ADD CONSTRAINT "_tracker_pilots_v_version_route_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_pilots_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v_version_linked_companies" ADD CONSTRAINT "_tracker_pilots_v_version_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_pilots_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v_version_status_history" ADD CONSTRAINT "_tracker_pilots_v_version_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_pilots_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v_version_estimates" ADD CONSTRAINT "_tracker_pilots_v_version_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_pilots_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v" ADD CONSTRAINT "_tracker_pilots_v_parent_id_tracker_pilots_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v" ADD CONSTRAINT "_tracker_pilots_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v" ADD CONSTRAINT "_tracker_pilots_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v" ADD CONSTRAINT "_tracker_pilots_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v_rels" ADD CONSTRAINT "_tracker_pilots_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_pilots_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_pilots_v_rels" ADD CONSTRAINT "_tracker_pilots_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations_linked_companies" ADD CONSTRAINT "tracker_stations_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations_status_history" ADD CONSTRAINT "tracker_stations_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations_estimates" ADD CONSTRAINT "tracker_stations_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations" ADD CONSTRAINT "tracker_stations_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations" ADD CONSTRAINT "tracker_stations_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations" ADD CONSTRAINT "tracker_stations_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations_numbers" ADD CONSTRAINT "tracker_stations_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations_rels" ADD CONSTRAINT "tracker_stations_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_stations_rels" ADD CONSTRAINT "tracker_stations_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v_version_linked_companies" ADD CONSTRAINT "_tracker_stations_v_version_linked_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_stations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v_version_status_history" ADD CONSTRAINT "_tracker_stations_v_version_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_stations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v_version_estimates" ADD CONSTRAINT "_tracker_stations_v_version_estimates_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_stations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v" ADD CONSTRAINT "_tracker_stations_v_parent_id_tracker_stations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v" ADD CONSTRAINT "_tracker_stations_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v" ADD CONSTRAINT "_tracker_stations_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v" ADD CONSTRAINT "_tracker_stations_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v_numbers" ADD CONSTRAINT "_tracker_stations_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_stations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v_rels" ADD CONSTRAINT "_tracker_stations_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_stations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_stations_v_rels" ADD CONSTRAINT "_tracker_stations_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_prices" ADD CONSTRAINT "tracker_prices_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_prices" ADD CONSTRAINT "tracker_prices_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_prices" ADD CONSTRAINT "tracker_prices_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_prices_rels" ADD CONSTRAINT "tracker_prices_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_prices_rels" ADD CONSTRAINT "tracker_prices_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_prices_v" ADD CONSTRAINT "_tracker_prices_v_parent_id_tracker_prices_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_prices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_prices_v" ADD CONSTRAINT "_tracker_prices_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_prices_v" ADD CONSTRAINT "_tracker_prices_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_prices_v" ADD CONSTRAINT "_tracker_prices_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_prices_v_rels" ADD CONSTRAINT "_tracker_prices_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tracker_prices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_prices_v_rels" ADD CONSTRAINT "_tracker_prices_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "cms"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_policies" ADD CONSTRAINT "tracker_policies_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "cms"."schemes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_policies" ADD CONSTRAINT "tracker_policies_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_policies" ADD CONSTRAINT "tracker_policies_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_policies" ADD CONSTRAINT "tracker_policies_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_policies_v" ADD CONSTRAINT "_tracker_policies_v_parent_id_tracker_policies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_policies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_policies_v" ADD CONSTRAINT "_tracker_policies_v_version_scheme_id_schemes_id_fk" FOREIGN KEY ("version_scheme_id") REFERENCES "cms"."schemes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_policies_v" ADD CONSTRAINT "_tracker_policies_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_policies_v" ADD CONSTRAINT "_tracker_policies_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_policies_v" ADD CONSTRAINT "_tracker_policies_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_hubs" ADD CONSTRAINT "tracker_hubs_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_hubs" ADD CONSTRAINT "tracker_hubs_entered_by_id_editors_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_hubs" ADD CONSTRAINT "tracker_hubs_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD CONSTRAINT "_tracker_hubs_v_parent_id_tracker_hubs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_hubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD CONSTRAINT "_tracker_hubs_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD CONSTRAINT "_tracker_hubs_v_version_entered_by_id_editors_id_fk" FOREIGN KEY ("version_entered_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_hubs_v" ADD CONSTRAINT "_tracker_hubs_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes" ADD CONSTRAINT "tracker_changes_changed_by_id_editors_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tracker_changes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_projects_fk" FOREIGN KEY ("tracker_projects_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_factories_fk" FOREIGN KEY ("tracker_factories_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_pilots_fk" FOREIGN KEY ("tracker_pilots_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_stations_fk" FOREIGN KEY ("tracker_stations_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_prices_fk" FOREIGN KEY ("tracker_prices_id") REFERENCES "cms"."tracker_prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_policies_fk" FOREIGN KEY ("tracker_policies_id") REFERENCES "cms"."tracker_policies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_changes_rels" ADD CONSTRAINT "tracker_changes_rels_tracker_hubs_fk" FOREIGN KEY ("tracker_hubs_id") REFERENCES "cms"."tracker_hubs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_methodology_status_meanings" ADD CONSTRAINT "tracker_methodology_status_meanings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_methodology_sources" ADD CONSTRAINT "tracker_methodology_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tracker_methodology_units" ADD CONSTRAINT "tracker_methodology_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tracker_methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_methodology_v_version_status_meanings" ADD CONSTRAINT "_tracker_methodology_v_version_status_meanings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_methodology_v_version_sources" ADD CONSTRAINT "_tracker_methodology_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tracker_methodology_v_version_units" ADD CONSTRAINT "_tracker_methodology_v_version_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tracker_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tracker_projects_linked_companies_order_idx" ON "cms"."tracker_projects_linked_companies" USING btree ("_order");
  CREATE INDEX "tracker_projects_linked_companies_parent_id_idx" ON "cms"."tracker_projects_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "tracker_projects_status_history_order_idx" ON "cms"."tracker_projects_status_history" USING btree ("_order");
  CREATE INDEX "tracker_projects_status_history_parent_id_idx" ON "cms"."tracker_projects_status_history" USING btree ("_parent_id");
  CREATE INDEX "tracker_projects_estimates_order_idx" ON "cms"."tracker_projects_estimates" USING btree ("order");
  CREATE INDEX "tracker_projects_estimates_parent_idx" ON "cms"."tracker_projects_estimates" USING btree ("parent_id");
  CREATE INDEX "tracker_projects_state_idx" ON "cms"."tracker_projects" USING btree ("state");
  CREATE UNIQUE INDEX "tracker_projects_slug_idx" ON "cms"."tracker_projects" USING btree ("slug");
  CREATE INDEX "tracker_projects_stage_idx" ON "cms"."tracker_projects" USING btree ("stage");
  CREATE INDEX "tracker_projects_owner_idx" ON "cms"."tracker_projects" USING btree ("owner_id");
  CREATE INDEX "tracker_projects_entered_by_idx" ON "cms"."tracker_projects" USING btree ("entered_by_id");
  CREATE INDEX "tracker_projects_verification_verification_by_idx" ON "cms"."tracker_projects" USING btree ("verification_by_id");
  CREATE INDEX "tracker_projects_updated_at_idx" ON "cms"."tracker_projects" USING btree ("updated_at");
  CREATE INDEX "tracker_projects_created_at_idx" ON "cms"."tracker_projects" USING btree ("created_at");
  CREATE INDEX "tracker_projects__status_idx" ON "cms"."tracker_projects" USING btree ("_status");
  CREATE INDEX "tracker_projects_rels_order_idx" ON "cms"."tracker_projects_rels" USING btree ("order");
  CREATE INDEX "tracker_projects_rels_parent_idx" ON "cms"."tracker_projects_rels" USING btree ("parent_id");
  CREATE INDEX "tracker_projects_rels_path_idx" ON "cms"."tracker_projects_rels" USING btree ("path");
  CREATE INDEX "tracker_projects_rels_articles_id_idx" ON "cms"."tracker_projects_rels" USING btree ("articles_id");
  CREATE INDEX "_tracker_projects_v_version_linked_companies_order_idx" ON "cms"."_tracker_projects_v_version_linked_companies" USING btree ("_order");
  CREATE INDEX "_tracker_projects_v_version_linked_companies_parent_id_idx" ON "cms"."_tracker_projects_v_version_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "_tracker_projects_v_version_status_history_order_idx" ON "cms"."_tracker_projects_v_version_status_history" USING btree ("_order");
  CREATE INDEX "_tracker_projects_v_version_status_history_parent_id_idx" ON "cms"."_tracker_projects_v_version_status_history" USING btree ("_parent_id");
  CREATE INDEX "_tracker_projects_v_version_estimates_order_idx" ON "cms"."_tracker_projects_v_version_estimates" USING btree ("order");
  CREATE INDEX "_tracker_projects_v_version_estimates_parent_idx" ON "cms"."_tracker_projects_v_version_estimates" USING btree ("parent_id");
  CREATE INDEX "_tracker_projects_v_parent_idx" ON "cms"."_tracker_projects_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_projects_v_version_version_state_idx" ON "cms"."_tracker_projects_v" USING btree ("version_state");
  CREATE INDEX "_tracker_projects_v_version_version_slug_idx" ON "cms"."_tracker_projects_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_projects_v_version_version_stage_idx" ON "cms"."_tracker_projects_v" USING btree ("version_stage");
  CREATE INDEX "_tracker_projects_v_version_version_owner_idx" ON "cms"."_tracker_projects_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_projects_v_version_version_entered_by_idx" ON "cms"."_tracker_projects_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_projects_v_version_verification_version_verific_idx" ON "cms"."_tracker_projects_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_projects_v_version_version_updated_at_idx" ON "cms"."_tracker_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_projects_v_version_version_created_at_idx" ON "cms"."_tracker_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_projects_v_version_version__status_idx" ON "cms"."_tracker_projects_v" USING btree ("version__status");
  CREATE INDEX "_tracker_projects_v_created_at_idx" ON "cms"."_tracker_projects_v" USING btree ("created_at");
  CREATE INDEX "_tracker_projects_v_updated_at_idx" ON "cms"."_tracker_projects_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_projects_v_latest_idx" ON "cms"."_tracker_projects_v" USING btree ("latest");
  CREATE INDEX "_tracker_projects_v_rels_order_idx" ON "cms"."_tracker_projects_v_rels" USING btree ("order");
  CREATE INDEX "_tracker_projects_v_rels_parent_idx" ON "cms"."_tracker_projects_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tracker_projects_v_rels_path_idx" ON "cms"."_tracker_projects_v_rels" USING btree ("path");
  CREATE INDEX "_tracker_projects_v_rels_articles_id_idx" ON "cms"."_tracker_projects_v_rels" USING btree ("articles_id");
  CREATE INDEX "tracker_factories_linked_companies_order_idx" ON "cms"."tracker_factories_linked_companies" USING btree ("_order");
  CREATE INDEX "tracker_factories_linked_companies_parent_id_idx" ON "cms"."tracker_factories_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "tracker_factories_status_history_order_idx" ON "cms"."tracker_factories_status_history" USING btree ("_order");
  CREATE INDEX "tracker_factories_status_history_parent_id_idx" ON "cms"."tracker_factories_status_history" USING btree ("_parent_id");
  CREATE INDEX "tracker_factories_estimates_order_idx" ON "cms"."tracker_factories_estimates" USING btree ("order");
  CREATE INDEX "tracker_factories_estimates_parent_idx" ON "cms"."tracker_factories_estimates" USING btree ("parent_id");
  CREATE INDEX "tracker_factories_state_idx" ON "cms"."tracker_factories" USING btree ("state");
  CREATE UNIQUE INDEX "tracker_factories_slug_idx" ON "cms"."tracker_factories" USING btree ("slug");
  CREATE INDEX "tracker_factories_stage_idx" ON "cms"."tracker_factories" USING btree ("stage");
  CREATE INDEX "tracker_factories_owner_idx" ON "cms"."tracker_factories" USING btree ("owner_id");
  CREATE INDEX "tracker_factories_entered_by_idx" ON "cms"."tracker_factories" USING btree ("entered_by_id");
  CREATE INDEX "tracker_factories_verification_verification_by_idx" ON "cms"."tracker_factories" USING btree ("verification_by_id");
  CREATE INDEX "tracker_factories_updated_at_idx" ON "cms"."tracker_factories" USING btree ("updated_at");
  CREATE INDEX "tracker_factories_created_at_idx" ON "cms"."tracker_factories" USING btree ("created_at");
  CREATE INDEX "tracker_factories__status_idx" ON "cms"."tracker_factories" USING btree ("_status");
  CREATE INDEX "tracker_factories_rels_order_idx" ON "cms"."tracker_factories_rels" USING btree ("order");
  CREATE INDEX "tracker_factories_rels_parent_idx" ON "cms"."tracker_factories_rels" USING btree ("parent_id");
  CREATE INDEX "tracker_factories_rels_path_idx" ON "cms"."tracker_factories_rels" USING btree ("path");
  CREATE INDEX "tracker_factories_rels_articles_id_idx" ON "cms"."tracker_factories_rels" USING btree ("articles_id");
  CREATE INDEX "_tracker_factories_v_version_linked_companies_order_idx" ON "cms"."_tracker_factories_v_version_linked_companies" USING btree ("_order");
  CREATE INDEX "_tracker_factories_v_version_linked_companies_parent_id_idx" ON "cms"."_tracker_factories_v_version_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "_tracker_factories_v_version_status_history_order_idx" ON "cms"."_tracker_factories_v_version_status_history" USING btree ("_order");
  CREATE INDEX "_tracker_factories_v_version_status_history_parent_id_idx" ON "cms"."_tracker_factories_v_version_status_history" USING btree ("_parent_id");
  CREATE INDEX "_tracker_factories_v_version_estimates_order_idx" ON "cms"."_tracker_factories_v_version_estimates" USING btree ("order");
  CREATE INDEX "_tracker_factories_v_version_estimates_parent_idx" ON "cms"."_tracker_factories_v_version_estimates" USING btree ("parent_id");
  CREATE INDEX "_tracker_factories_v_parent_idx" ON "cms"."_tracker_factories_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_factories_v_version_version_state_idx" ON "cms"."_tracker_factories_v" USING btree ("version_state");
  CREATE INDEX "_tracker_factories_v_version_version_slug_idx" ON "cms"."_tracker_factories_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_factories_v_version_version_stage_idx" ON "cms"."_tracker_factories_v" USING btree ("version_stage");
  CREATE INDEX "_tracker_factories_v_version_version_owner_idx" ON "cms"."_tracker_factories_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_factories_v_version_version_entered_by_idx" ON "cms"."_tracker_factories_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_factories_v_version_verification_version_verifi_idx" ON "cms"."_tracker_factories_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_factories_v_version_version_updated_at_idx" ON "cms"."_tracker_factories_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_factories_v_version_version_created_at_idx" ON "cms"."_tracker_factories_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_factories_v_version_version__status_idx" ON "cms"."_tracker_factories_v" USING btree ("version__status");
  CREATE INDEX "_tracker_factories_v_created_at_idx" ON "cms"."_tracker_factories_v" USING btree ("created_at");
  CREATE INDEX "_tracker_factories_v_updated_at_idx" ON "cms"."_tracker_factories_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_factories_v_latest_idx" ON "cms"."_tracker_factories_v" USING btree ("latest");
  CREATE INDEX "_tracker_factories_v_rels_order_idx" ON "cms"."_tracker_factories_v_rels" USING btree ("order");
  CREATE INDEX "_tracker_factories_v_rels_parent_idx" ON "cms"."_tracker_factories_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tracker_factories_v_rels_path_idx" ON "cms"."_tracker_factories_v_rels" USING btree ("path");
  CREATE INDEX "_tracker_factories_v_rels_articles_id_idx" ON "cms"."_tracker_factories_v_rels" USING btree ("articles_id");
  CREATE INDEX "tracker_pilots_route_order_idx" ON "cms"."tracker_pilots_route" USING btree ("_order");
  CREATE INDEX "tracker_pilots_route_parent_id_idx" ON "cms"."tracker_pilots_route" USING btree ("_parent_id");
  CREATE INDEX "tracker_pilots_linked_companies_order_idx" ON "cms"."tracker_pilots_linked_companies" USING btree ("_order");
  CREATE INDEX "tracker_pilots_linked_companies_parent_id_idx" ON "cms"."tracker_pilots_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "tracker_pilots_status_history_order_idx" ON "cms"."tracker_pilots_status_history" USING btree ("_order");
  CREATE INDEX "tracker_pilots_status_history_parent_id_idx" ON "cms"."tracker_pilots_status_history" USING btree ("_parent_id");
  CREATE INDEX "tracker_pilots_estimates_order_idx" ON "cms"."tracker_pilots_estimates" USING btree ("order");
  CREATE INDEX "tracker_pilots_estimates_parent_idx" ON "cms"."tracker_pilots_estimates" USING btree ("parent_id");
  CREATE INDEX "tracker_pilots_state_idx" ON "cms"."tracker_pilots" USING btree ("state");
  CREATE UNIQUE INDEX "tracker_pilots_slug_idx" ON "cms"."tracker_pilots" USING btree ("slug");
  CREATE INDEX "tracker_pilots_stage_idx" ON "cms"."tracker_pilots" USING btree ("stage");
  CREATE INDEX "tracker_pilots_owner_idx" ON "cms"."tracker_pilots" USING btree ("owner_id");
  CREATE INDEX "tracker_pilots_entered_by_idx" ON "cms"."tracker_pilots" USING btree ("entered_by_id");
  CREATE INDEX "tracker_pilots_verification_verification_by_idx" ON "cms"."tracker_pilots" USING btree ("verification_by_id");
  CREATE INDEX "tracker_pilots_updated_at_idx" ON "cms"."tracker_pilots" USING btree ("updated_at");
  CREATE INDEX "tracker_pilots_created_at_idx" ON "cms"."tracker_pilots" USING btree ("created_at");
  CREATE INDEX "tracker_pilots__status_idx" ON "cms"."tracker_pilots" USING btree ("_status");
  CREATE INDEX "tracker_pilots_rels_order_idx" ON "cms"."tracker_pilots_rels" USING btree ("order");
  CREATE INDEX "tracker_pilots_rels_parent_idx" ON "cms"."tracker_pilots_rels" USING btree ("parent_id");
  CREATE INDEX "tracker_pilots_rels_path_idx" ON "cms"."tracker_pilots_rels" USING btree ("path");
  CREATE INDEX "tracker_pilots_rels_articles_id_idx" ON "cms"."tracker_pilots_rels" USING btree ("articles_id");
  CREATE INDEX "_tracker_pilots_v_version_route_order_idx" ON "cms"."_tracker_pilots_v_version_route" USING btree ("_order");
  CREATE INDEX "_tracker_pilots_v_version_route_parent_id_idx" ON "cms"."_tracker_pilots_v_version_route" USING btree ("_parent_id");
  CREATE INDEX "_tracker_pilots_v_version_linked_companies_order_idx" ON "cms"."_tracker_pilots_v_version_linked_companies" USING btree ("_order");
  CREATE INDEX "_tracker_pilots_v_version_linked_companies_parent_id_idx" ON "cms"."_tracker_pilots_v_version_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "_tracker_pilots_v_version_status_history_order_idx" ON "cms"."_tracker_pilots_v_version_status_history" USING btree ("_order");
  CREATE INDEX "_tracker_pilots_v_version_status_history_parent_id_idx" ON "cms"."_tracker_pilots_v_version_status_history" USING btree ("_parent_id");
  CREATE INDEX "_tracker_pilots_v_version_estimates_order_idx" ON "cms"."_tracker_pilots_v_version_estimates" USING btree ("order");
  CREATE INDEX "_tracker_pilots_v_version_estimates_parent_idx" ON "cms"."_tracker_pilots_v_version_estimates" USING btree ("parent_id");
  CREATE INDEX "_tracker_pilots_v_parent_idx" ON "cms"."_tracker_pilots_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_pilots_v_version_version_state_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_state");
  CREATE INDEX "_tracker_pilots_v_version_version_slug_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_pilots_v_version_version_stage_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_stage");
  CREATE INDEX "_tracker_pilots_v_version_version_owner_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_pilots_v_version_version_entered_by_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_pilots_v_version_verification_version_verificat_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_pilots_v_version_version_updated_at_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_pilots_v_version_version_created_at_idx" ON "cms"."_tracker_pilots_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_pilots_v_version_version__status_idx" ON "cms"."_tracker_pilots_v" USING btree ("version__status");
  CREATE INDEX "_tracker_pilots_v_created_at_idx" ON "cms"."_tracker_pilots_v" USING btree ("created_at");
  CREATE INDEX "_tracker_pilots_v_updated_at_idx" ON "cms"."_tracker_pilots_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_pilots_v_latest_idx" ON "cms"."_tracker_pilots_v" USING btree ("latest");
  CREATE INDEX "_tracker_pilots_v_rels_order_idx" ON "cms"."_tracker_pilots_v_rels" USING btree ("order");
  CREATE INDEX "_tracker_pilots_v_rels_parent_idx" ON "cms"."_tracker_pilots_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tracker_pilots_v_rels_path_idx" ON "cms"."_tracker_pilots_v_rels" USING btree ("path");
  CREATE INDEX "_tracker_pilots_v_rels_articles_id_idx" ON "cms"."_tracker_pilots_v_rels" USING btree ("articles_id");
  CREATE INDEX "tracker_stations_linked_companies_order_idx" ON "cms"."tracker_stations_linked_companies" USING btree ("_order");
  CREATE INDEX "tracker_stations_linked_companies_parent_id_idx" ON "cms"."tracker_stations_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "tracker_stations_status_history_order_idx" ON "cms"."tracker_stations_status_history" USING btree ("_order");
  CREATE INDEX "tracker_stations_status_history_parent_id_idx" ON "cms"."tracker_stations_status_history" USING btree ("_parent_id");
  CREATE INDEX "tracker_stations_estimates_order_idx" ON "cms"."tracker_stations_estimates" USING btree ("order");
  CREATE INDEX "tracker_stations_estimates_parent_idx" ON "cms"."tracker_stations_estimates" USING btree ("parent_id");
  CREATE INDEX "tracker_stations_state_idx" ON "cms"."tracker_stations" USING btree ("state");
  CREATE UNIQUE INDEX "tracker_stations_slug_idx" ON "cms"."tracker_stations" USING btree ("slug");
  CREATE INDEX "tracker_stations_stage_idx" ON "cms"."tracker_stations" USING btree ("stage");
  CREATE INDEX "tracker_stations_owner_idx" ON "cms"."tracker_stations" USING btree ("owner_id");
  CREATE INDEX "tracker_stations_entered_by_idx" ON "cms"."tracker_stations" USING btree ("entered_by_id");
  CREATE INDEX "tracker_stations_verification_verification_by_idx" ON "cms"."tracker_stations" USING btree ("verification_by_id");
  CREATE INDEX "tracker_stations_updated_at_idx" ON "cms"."tracker_stations" USING btree ("updated_at");
  CREATE INDEX "tracker_stations_created_at_idx" ON "cms"."tracker_stations" USING btree ("created_at");
  CREATE INDEX "tracker_stations__status_idx" ON "cms"."tracker_stations" USING btree ("_status");
  CREATE INDEX "tracker_stations_numbers_order_parent_idx" ON "cms"."tracker_stations_numbers" USING btree ("order","parent_id");
  CREATE INDEX "tracker_stations_rels_order_idx" ON "cms"."tracker_stations_rels" USING btree ("order");
  CREATE INDEX "tracker_stations_rels_parent_idx" ON "cms"."tracker_stations_rels" USING btree ("parent_id");
  CREATE INDEX "tracker_stations_rels_path_idx" ON "cms"."tracker_stations_rels" USING btree ("path");
  CREATE INDEX "tracker_stations_rels_articles_id_idx" ON "cms"."tracker_stations_rels" USING btree ("articles_id");
  CREATE INDEX "_tracker_stations_v_version_linked_companies_order_idx" ON "cms"."_tracker_stations_v_version_linked_companies" USING btree ("_order");
  CREATE INDEX "_tracker_stations_v_version_linked_companies_parent_id_idx" ON "cms"."_tracker_stations_v_version_linked_companies" USING btree ("_parent_id");
  CREATE INDEX "_tracker_stations_v_version_status_history_order_idx" ON "cms"."_tracker_stations_v_version_status_history" USING btree ("_order");
  CREATE INDEX "_tracker_stations_v_version_status_history_parent_id_idx" ON "cms"."_tracker_stations_v_version_status_history" USING btree ("_parent_id");
  CREATE INDEX "_tracker_stations_v_version_estimates_order_idx" ON "cms"."_tracker_stations_v_version_estimates" USING btree ("order");
  CREATE INDEX "_tracker_stations_v_version_estimates_parent_idx" ON "cms"."_tracker_stations_v_version_estimates" USING btree ("parent_id");
  CREATE INDEX "_tracker_stations_v_parent_idx" ON "cms"."_tracker_stations_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_stations_v_version_version_state_idx" ON "cms"."_tracker_stations_v" USING btree ("version_state");
  CREATE INDEX "_tracker_stations_v_version_version_slug_idx" ON "cms"."_tracker_stations_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_stations_v_version_version_stage_idx" ON "cms"."_tracker_stations_v" USING btree ("version_stage");
  CREATE INDEX "_tracker_stations_v_version_version_owner_idx" ON "cms"."_tracker_stations_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_stations_v_version_version_entered_by_idx" ON "cms"."_tracker_stations_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_stations_v_version_verification_version_verific_idx" ON "cms"."_tracker_stations_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_stations_v_version_version_updated_at_idx" ON "cms"."_tracker_stations_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_stations_v_version_version_created_at_idx" ON "cms"."_tracker_stations_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_stations_v_version_version__status_idx" ON "cms"."_tracker_stations_v" USING btree ("version__status");
  CREATE INDEX "_tracker_stations_v_created_at_idx" ON "cms"."_tracker_stations_v" USING btree ("created_at");
  CREATE INDEX "_tracker_stations_v_updated_at_idx" ON "cms"."_tracker_stations_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_stations_v_latest_idx" ON "cms"."_tracker_stations_v" USING btree ("latest");
  CREATE INDEX "_tracker_stations_v_numbers_order_parent_idx" ON "cms"."_tracker_stations_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_tracker_stations_v_rels_order_idx" ON "cms"."_tracker_stations_v_rels" USING btree ("order");
  CREATE INDEX "_tracker_stations_v_rels_parent_idx" ON "cms"."_tracker_stations_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tracker_stations_v_rels_path_idx" ON "cms"."_tracker_stations_v_rels" USING btree ("path");
  CREATE INDEX "_tracker_stations_v_rels_articles_id_idx" ON "cms"."_tracker_stations_v_rels" USING btree ("articles_id");
  CREATE UNIQUE INDEX "tracker_prices_slug_idx" ON "cms"."tracker_prices" USING btree ("slug");
  CREATE INDEX "tracker_prices_owner_idx" ON "cms"."tracker_prices" USING btree ("owner_id");
  CREATE INDEX "tracker_prices_entered_by_idx" ON "cms"."tracker_prices" USING btree ("entered_by_id");
  CREATE INDEX "tracker_prices_verification_verification_by_idx" ON "cms"."tracker_prices" USING btree ("verification_by_id");
  CREATE INDEX "tracker_prices_updated_at_idx" ON "cms"."tracker_prices" USING btree ("updated_at");
  CREATE INDEX "tracker_prices_created_at_idx" ON "cms"."tracker_prices" USING btree ("created_at");
  CREATE INDEX "tracker_prices__status_idx" ON "cms"."tracker_prices" USING btree ("_status");
  CREATE INDEX "tracker_prices_rels_order_idx" ON "cms"."tracker_prices_rels" USING btree ("order");
  CREATE INDEX "tracker_prices_rels_parent_idx" ON "cms"."tracker_prices_rels" USING btree ("parent_id");
  CREATE INDEX "tracker_prices_rels_path_idx" ON "cms"."tracker_prices_rels" USING btree ("path");
  CREATE INDEX "tracker_prices_rels_articles_id_idx" ON "cms"."tracker_prices_rels" USING btree ("articles_id");
  CREATE INDEX "_tracker_prices_v_parent_idx" ON "cms"."_tracker_prices_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_prices_v_version_version_slug_idx" ON "cms"."_tracker_prices_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_prices_v_version_version_owner_idx" ON "cms"."_tracker_prices_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_prices_v_version_version_entered_by_idx" ON "cms"."_tracker_prices_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_prices_v_version_verification_version_verificat_idx" ON "cms"."_tracker_prices_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_prices_v_version_version_updated_at_idx" ON "cms"."_tracker_prices_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_prices_v_version_version_created_at_idx" ON "cms"."_tracker_prices_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_prices_v_version_version__status_idx" ON "cms"."_tracker_prices_v" USING btree ("version__status");
  CREATE INDEX "_tracker_prices_v_created_at_idx" ON "cms"."_tracker_prices_v" USING btree ("created_at");
  CREATE INDEX "_tracker_prices_v_updated_at_idx" ON "cms"."_tracker_prices_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_prices_v_latest_idx" ON "cms"."_tracker_prices_v" USING btree ("latest");
  CREATE INDEX "_tracker_prices_v_rels_order_idx" ON "cms"."_tracker_prices_v_rels" USING btree ("order");
  CREATE INDEX "_tracker_prices_v_rels_parent_idx" ON "cms"."_tracker_prices_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tracker_prices_v_rels_path_idx" ON "cms"."_tracker_prices_v_rels" USING btree ("path");
  CREATE INDEX "_tracker_prices_v_rels_articles_id_idx" ON "cms"."_tracker_prices_v_rels" USING btree ("articles_id");
  CREATE INDEX "tracker_policies_state_idx" ON "cms"."tracker_policies" USING btree ("state");
  CREATE INDEX "tracker_policies_scheme_idx" ON "cms"."tracker_policies" USING btree ("scheme_id");
  CREATE UNIQUE INDEX "tracker_policies_slug_idx" ON "cms"."tracker_policies" USING btree ("slug");
  CREATE INDEX "tracker_policies_owner_idx" ON "cms"."tracker_policies" USING btree ("owner_id");
  CREATE INDEX "tracker_policies_entered_by_idx" ON "cms"."tracker_policies" USING btree ("entered_by_id");
  CREATE INDEX "tracker_policies_verification_verification_by_idx" ON "cms"."tracker_policies" USING btree ("verification_by_id");
  CREATE INDEX "tracker_policies_updated_at_idx" ON "cms"."tracker_policies" USING btree ("updated_at");
  CREATE INDEX "tracker_policies_created_at_idx" ON "cms"."tracker_policies" USING btree ("created_at");
  CREATE INDEX "tracker_policies__status_idx" ON "cms"."tracker_policies" USING btree ("_status");
  CREATE INDEX "_tracker_policies_v_parent_idx" ON "cms"."_tracker_policies_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_policies_v_version_version_state_idx" ON "cms"."_tracker_policies_v" USING btree ("version_state");
  CREATE INDEX "_tracker_policies_v_version_version_scheme_idx" ON "cms"."_tracker_policies_v" USING btree ("version_scheme_id");
  CREATE INDEX "_tracker_policies_v_version_version_slug_idx" ON "cms"."_tracker_policies_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_policies_v_version_version_owner_idx" ON "cms"."_tracker_policies_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_policies_v_version_version_entered_by_idx" ON "cms"."_tracker_policies_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_policies_v_version_verification_version_verific_idx" ON "cms"."_tracker_policies_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_policies_v_version_version_updated_at_idx" ON "cms"."_tracker_policies_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_policies_v_version_version_created_at_idx" ON "cms"."_tracker_policies_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_policies_v_version_version__status_idx" ON "cms"."_tracker_policies_v" USING btree ("version__status");
  CREATE INDEX "_tracker_policies_v_created_at_idx" ON "cms"."_tracker_policies_v" USING btree ("created_at");
  CREATE INDEX "_tracker_policies_v_updated_at_idx" ON "cms"."_tracker_policies_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_policies_v_latest_idx" ON "cms"."_tracker_policies_v" USING btree ("latest");
  CREATE INDEX "tracker_hubs_state_idx" ON "cms"."tracker_hubs" USING btree ("state");
  CREATE UNIQUE INDEX "tracker_hubs_slug_idx" ON "cms"."tracker_hubs" USING btree ("slug");
  CREATE INDEX "tracker_hubs_owner_idx" ON "cms"."tracker_hubs" USING btree ("owner_id");
  CREATE INDEX "tracker_hubs_entered_by_idx" ON "cms"."tracker_hubs" USING btree ("entered_by_id");
  CREATE INDEX "tracker_hubs_verification_verification_by_idx" ON "cms"."tracker_hubs" USING btree ("verification_by_id");
  CREATE INDEX "tracker_hubs_updated_at_idx" ON "cms"."tracker_hubs" USING btree ("updated_at");
  CREATE INDEX "tracker_hubs_created_at_idx" ON "cms"."tracker_hubs" USING btree ("created_at");
  CREATE INDEX "tracker_hubs__status_idx" ON "cms"."tracker_hubs" USING btree ("_status");
  CREATE INDEX "_tracker_hubs_v_parent_idx" ON "cms"."_tracker_hubs_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_hubs_v_version_version_state_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_state");
  CREATE INDEX "_tracker_hubs_v_version_version_slug_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_slug");
  CREATE INDEX "_tracker_hubs_v_version_version_owner_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_owner_id");
  CREATE INDEX "_tracker_hubs_v_version_version_entered_by_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_entered_by_id");
  CREATE INDEX "_tracker_hubs_v_version_verification_version_verificatio_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tracker_hubs_v_version_version_updated_at_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_hubs_v_version_version_created_at_idx" ON "cms"."_tracker_hubs_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_hubs_v_version_version__status_idx" ON "cms"."_tracker_hubs_v" USING btree ("version__status");
  CREATE INDEX "_tracker_hubs_v_created_at_idx" ON "cms"."_tracker_hubs_v" USING btree ("created_at");
  CREATE INDEX "_tracker_hubs_v_updated_at_idx" ON "cms"."_tracker_hubs_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_hubs_v_latest_idx" ON "cms"."_tracker_hubs_v" USING btree ("latest");
  CREATE INDEX "tracker_changes_at_idx" ON "cms"."tracker_changes" USING btree ("at");
  CREATE INDEX "tracker_changes_view_idx" ON "cms"."tracker_changes" USING btree ("view");
  CREATE INDEX "tracker_changes_changed_by_idx" ON "cms"."tracker_changes" USING btree ("changed_by_id");
  CREATE INDEX "tracker_changes_sample_idx" ON "cms"."tracker_changes" USING btree ("sample");
  CREATE INDEX "tracker_changes_updated_at_idx" ON "cms"."tracker_changes" USING btree ("updated_at");
  CREATE INDEX "tracker_changes_created_at_idx" ON "cms"."tracker_changes" USING btree ("created_at");
  CREATE INDEX "tracker_changes_rels_order_idx" ON "cms"."tracker_changes_rels" USING btree ("order");
  CREATE INDEX "tracker_changes_rels_parent_idx" ON "cms"."tracker_changes_rels" USING btree ("parent_id");
  CREATE INDEX "tracker_changes_rels_path_idx" ON "cms"."tracker_changes_rels" USING btree ("path");
  CREATE INDEX "tracker_changes_rels_tracker_projects_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_projects_id");
  CREATE INDEX "tracker_changes_rels_tracker_factories_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_factories_id");
  CREATE INDEX "tracker_changes_rels_tracker_pilots_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_pilots_id");
  CREATE INDEX "tracker_changes_rels_tracker_stations_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_stations_id");
  CREATE INDEX "tracker_changes_rels_tracker_prices_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_prices_id");
  CREATE INDEX "tracker_changes_rels_tracker_policies_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_policies_id");
  CREATE INDEX "tracker_changes_rels_tracker_hubs_id_idx" ON "cms"."tracker_changes_rels" USING btree ("tracker_hubs_id");
  CREATE INDEX "tracker_methodology_status_meanings_order_idx" ON "cms"."tracker_methodology_status_meanings" USING btree ("_order");
  CREATE INDEX "tracker_methodology_status_meanings_parent_id_idx" ON "cms"."tracker_methodology_status_meanings" USING btree ("_parent_id");
  CREATE INDEX "tracker_methodology_sources_order_idx" ON "cms"."tracker_methodology_sources" USING btree ("_order");
  CREATE INDEX "tracker_methodology_sources_parent_id_idx" ON "cms"."tracker_methodology_sources" USING btree ("_parent_id");
  CREATE INDEX "tracker_methodology_units_order_idx" ON "cms"."tracker_methodology_units" USING btree ("_order");
  CREATE INDEX "tracker_methodology_units_parent_id_idx" ON "cms"."tracker_methodology_units" USING btree ("_parent_id");
  CREATE INDEX "_tracker_methodology_v_version_status_meanings_order_idx" ON "cms"."_tracker_methodology_v_version_status_meanings" USING btree ("_order");
  CREATE INDEX "_tracker_methodology_v_version_status_meanings_parent_id_idx" ON "cms"."_tracker_methodology_v_version_status_meanings" USING btree ("_parent_id");
  CREATE INDEX "_tracker_methodology_v_version_sources_order_idx" ON "cms"."_tracker_methodology_v_version_sources" USING btree ("_order");
  CREATE INDEX "_tracker_methodology_v_version_sources_parent_id_idx" ON "cms"."_tracker_methodology_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_tracker_methodology_v_version_units_order_idx" ON "cms"."_tracker_methodology_v_version_units" USING btree ("_order");
  CREATE INDEX "_tracker_methodology_v_version_units_parent_id_idx" ON "cms"."_tracker_methodology_v_version_units" USING btree ("_parent_id");
  CREATE INDEX "_tracker_methodology_v_created_at_idx" ON "cms"."_tracker_methodology_v" USING btree ("created_at");
  CREATE INDEX "_tracker_methodology_v_updated_at_idx" ON "cms"."_tracker_methodology_v" USING btree ("updated_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_projects_fk" FOREIGN KEY ("tracker_projects_id") REFERENCES "cms"."tracker_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_factories_fk" FOREIGN KEY ("tracker_factories_id") REFERENCES "cms"."tracker_factories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_pilots_fk" FOREIGN KEY ("tracker_pilots_id") REFERENCES "cms"."tracker_pilots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_stations_fk" FOREIGN KEY ("tracker_stations_id") REFERENCES "cms"."tracker_stations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_prices_fk" FOREIGN KEY ("tracker_prices_id") REFERENCES "cms"."tracker_prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_policies_fk" FOREIGN KEY ("tracker_policies_id") REFERENCES "cms"."tracker_policies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_hubs_fk" FOREIGN KEY ("tracker_hubs_id") REFERENCES "cms"."tracker_hubs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_changes_fk" FOREIGN KEY ("tracker_changes_id") REFERENCES "cms"."tracker_changes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_tracker_projects_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_projects_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_factories_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_factories_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_pilots_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_pilots_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_stations_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_stations_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_prices_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_prices_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_policies_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_policies_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_hubs_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_hubs_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_changes_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tracker_changes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."tracker_projects_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_projects_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_projects_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_projects_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_projects_v_version_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_projects_v_version_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_projects_v_version_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_projects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_projects_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_factories_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_factories_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_factories_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_factories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_factories_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_factories_v_version_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_factories_v_version_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_factories_v_version_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_factories_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_factories_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_pilots_route" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_pilots_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_pilots_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_pilots_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_pilots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_pilots_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_pilots_v_version_route" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_pilots_v_version_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_pilots_v_version_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_pilots_v_version_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_pilots_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_pilots_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_stations_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_stations_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_stations_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_stations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_stations_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_stations_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_stations_v_version_linked_companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_stations_v_version_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_stations_v_version_estimates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_stations_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_stations_v_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_stations_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_prices_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_prices_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_prices_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_policies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_policies_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_hubs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_hubs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_changes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_changes_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_methodology_status_meanings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_methodology_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_methodology_units" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracker_methodology" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_methodology_v_version_status_meanings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_methodology_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_methodology_v_version_units" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tracker_methodology_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."tracker_projects_linked_companies" CASCADE;
  DROP TABLE "cms"."tracker_projects_status_history" CASCADE;
  DROP TABLE "cms"."tracker_projects_estimates" CASCADE;
  DROP TABLE "cms"."tracker_projects" CASCADE;
  DROP TABLE "cms"."tracker_projects_rels" CASCADE;
  DROP TABLE "cms"."_tracker_projects_v_version_linked_companies" CASCADE;
  DROP TABLE "cms"."_tracker_projects_v_version_status_history" CASCADE;
  DROP TABLE "cms"."_tracker_projects_v_version_estimates" CASCADE;
  DROP TABLE "cms"."_tracker_projects_v" CASCADE;
  DROP TABLE "cms"."_tracker_projects_v_rels" CASCADE;
  DROP TABLE "cms"."tracker_factories_linked_companies" CASCADE;
  DROP TABLE "cms"."tracker_factories_status_history" CASCADE;
  DROP TABLE "cms"."tracker_factories_estimates" CASCADE;
  DROP TABLE "cms"."tracker_factories" CASCADE;
  DROP TABLE "cms"."tracker_factories_rels" CASCADE;
  DROP TABLE "cms"."_tracker_factories_v_version_linked_companies" CASCADE;
  DROP TABLE "cms"."_tracker_factories_v_version_status_history" CASCADE;
  DROP TABLE "cms"."_tracker_factories_v_version_estimates" CASCADE;
  DROP TABLE "cms"."_tracker_factories_v" CASCADE;
  DROP TABLE "cms"."_tracker_factories_v_rels" CASCADE;
  DROP TABLE "cms"."tracker_pilots_route" CASCADE;
  DROP TABLE "cms"."tracker_pilots_linked_companies" CASCADE;
  DROP TABLE "cms"."tracker_pilots_status_history" CASCADE;
  DROP TABLE "cms"."tracker_pilots_estimates" CASCADE;
  DROP TABLE "cms"."tracker_pilots" CASCADE;
  DROP TABLE "cms"."tracker_pilots_rels" CASCADE;
  DROP TABLE "cms"."_tracker_pilots_v_version_route" CASCADE;
  DROP TABLE "cms"."_tracker_pilots_v_version_linked_companies" CASCADE;
  DROP TABLE "cms"."_tracker_pilots_v_version_status_history" CASCADE;
  DROP TABLE "cms"."_tracker_pilots_v_version_estimates" CASCADE;
  DROP TABLE "cms"."_tracker_pilots_v" CASCADE;
  DROP TABLE "cms"."_tracker_pilots_v_rels" CASCADE;
  DROP TABLE "cms"."tracker_stations_linked_companies" CASCADE;
  DROP TABLE "cms"."tracker_stations_status_history" CASCADE;
  DROP TABLE "cms"."tracker_stations_estimates" CASCADE;
  DROP TABLE "cms"."tracker_stations" CASCADE;
  DROP TABLE "cms"."tracker_stations_numbers" CASCADE;
  DROP TABLE "cms"."tracker_stations_rels" CASCADE;
  DROP TABLE "cms"."_tracker_stations_v_version_linked_companies" CASCADE;
  DROP TABLE "cms"."_tracker_stations_v_version_status_history" CASCADE;
  DROP TABLE "cms"."_tracker_stations_v_version_estimates" CASCADE;
  DROP TABLE "cms"."_tracker_stations_v" CASCADE;
  DROP TABLE "cms"."_tracker_stations_v_numbers" CASCADE;
  DROP TABLE "cms"."_tracker_stations_v_rels" CASCADE;
  DROP TABLE "cms"."tracker_prices" CASCADE;
  DROP TABLE "cms"."tracker_prices_rels" CASCADE;
  DROP TABLE "cms"."_tracker_prices_v" CASCADE;
  DROP TABLE "cms"."_tracker_prices_v_rels" CASCADE;
  DROP TABLE "cms"."tracker_policies" CASCADE;
  DROP TABLE "cms"."_tracker_policies_v" CASCADE;
  DROP TABLE "cms"."tracker_hubs" CASCADE;
  DROP TABLE "cms"."_tracker_hubs_v" CASCADE;
  DROP TABLE "cms"."tracker_changes" CASCADE;
  DROP TABLE "cms"."tracker_changes_rels" CASCADE;
  DROP TABLE "cms"."tracker_methodology_status_meanings" CASCADE;
  DROP TABLE "cms"."tracker_methodology_sources" CASCADE;
  DROP TABLE "cms"."tracker_methodology_units" CASCADE;
  DROP TABLE "cms"."tracker_methodology" CASCADE;
  DROP TABLE "cms"."_tracker_methodology_v_version_status_meanings" CASCADE;
  DROP TABLE "cms"."_tracker_methodology_v_version_sources" CASCADE;
  DROP TABLE "cms"."_tracker_methodology_v_version_units" CASCADE;
  DROP TABLE "cms"."_tracker_methodology_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_projects_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_factories_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_pilots_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_stations_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_prices_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_policies_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_hubs_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracker_changes_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_projects_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_factories_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_pilots_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_stations_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_prices_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_policies_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_hubs_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tracker_changes_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_projects_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_factories_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_pilots_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_stations_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_prices_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_policies_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_hubs_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tracker_changes_id";
  DROP TYPE "cms"."enum_tracker_projects_status_history_status";
  DROP TYPE "cms"."enum_tracker_projects_estimates";
  DROP TYPE "cms"."enum_tracker_projects_product";
  DROP TYPE "cms"."enum_tracker_projects_state";
  DROP TYPE "cms"."enum_tracker_projects_technology";
  DROP TYPE "cms"."enum_tracker_projects_stage";
  DROP TYPE "cms"."enum_tracker_projects_source_tier";
  DROP TYPE "cms"."enum_tracker_projects_status";
  DROP TYPE "cms"."enum__tracker_projects_v_version_status_history_status";
  DROP TYPE "cms"."enum__tracker_projects_v_version_estimates";
  DROP TYPE "cms"."enum__tracker_projects_v_version_product";
  DROP TYPE "cms"."enum__tracker_projects_v_version_state";
  DROP TYPE "cms"."enum__tracker_projects_v_version_technology";
  DROP TYPE "cms"."enum__tracker_projects_v_version_stage";
  DROP TYPE "cms"."enum__tracker_projects_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_projects_v_version_status";
  DROP TYPE "cms"."enum_tracker_factories_status_history_status";
  DROP TYPE "cms"."enum_tracker_factories_estimates";
  DROP TYPE "cms"."enum_tracker_factories_product";
  DROP TYPE "cms"."enum_tracker_factories_technology";
  DROP TYPE "cms"."enum_tracker_factories_tranche";
  DROP TYPE "cms"."enum_tracker_factories_state";
  DROP TYPE "cms"."enum_tracker_factories_stage";
  DROP TYPE "cms"."enum_tracker_factories_source_tier";
  DROP TYPE "cms"."enum_tracker_factories_status";
  DROP TYPE "cms"."enum__tracker_factories_v_version_status_history_status";
  DROP TYPE "cms"."enum__tracker_factories_v_version_estimates";
  DROP TYPE "cms"."enum__tracker_factories_v_version_product";
  DROP TYPE "cms"."enum__tracker_factories_v_version_technology";
  DROP TYPE "cms"."enum__tracker_factories_v_version_tranche";
  DROP TYPE "cms"."enum__tracker_factories_v_version_state";
  DROP TYPE "cms"."enum__tracker_factories_v_version_stage";
  DROP TYPE "cms"."enum__tracker_factories_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_factories_v_version_status";
  DROP TYPE "cms"."enum_tracker_pilots_status_history_status";
  DROP TYPE "cms"."enum_tracker_pilots_estimates";
  DROP TYPE "cms"."enum_tracker_pilots_sector";
  DROP TYPE "cms"."enum_tracker_pilots_state";
  DROP TYPE "cms"."enum_tracker_pilots_stage";
  DROP TYPE "cms"."enum_tracker_pilots_source_tier";
  DROP TYPE "cms"."enum_tracker_pilots_status";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_status_history_status";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_estimates";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_sector";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_state";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_stage";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_pilots_v_version_status";
  DROP TYPE "cms"."enum_tracker_stations_status_history_status";
  DROP TYPE "cms"."enum_tracker_stations_estimates";
  DROP TYPE "cms"."enum_tracker_stations_state";
  DROP TYPE "cms"."enum_tracker_stations_stage";
  DROP TYPE "cms"."enum_tracker_stations_source_tier";
  DROP TYPE "cms"."enum_tracker_stations_status";
  DROP TYPE "cms"."enum__tracker_stations_v_version_status_history_status";
  DROP TYPE "cms"."enum__tracker_stations_v_version_estimates";
  DROP TYPE "cms"."enum__tracker_stations_v_version_state";
  DROP TYPE "cms"."enum__tracker_stations_v_version_stage";
  DROP TYPE "cms"."enum__tracker_stations_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_stations_v_version_status";
  DROP TYPE "cms"."enum_tracker_prices_product";
  DROP TYPE "cms"."enum_tracker_prices_gst_basis";
  DROP TYPE "cms"."enum_tracker_prices_state";
  DROP TYPE "cms"."enum_tracker_prices_source_tier";
  DROP TYPE "cms"."enum_tracker_prices_status";
  DROP TYPE "cms"."enum__tracker_prices_v_version_product";
  DROP TYPE "cms"."enum__tracker_prices_v_version_gst_basis";
  DROP TYPE "cms"."enum__tracker_prices_v_version_state";
  DROP TYPE "cms"."enum__tracker_prices_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_prices_v_version_status";
  DROP TYPE "cms"."enum_tracker_policies_state";
  DROP TYPE "cms"."enum_tracker_policies_type";
  DROP TYPE "cms"."enum_tracker_policies_source_tier";
  DROP TYPE "cms"."enum_tracker_policies_status";
  DROP TYPE "cms"."enum__tracker_policies_v_version_state";
  DROP TYPE "cms"."enum__tracker_policies_v_version_type";
  DROP TYPE "cms"."enum__tracker_policies_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_policies_v_version_status";
  DROP TYPE "cms"."enum_tracker_hubs_kind";
  DROP TYPE "cms"."enum_tracker_hubs_state";
  DROP TYPE "cms"."enum_tracker_hubs_source_tier";
  DROP TYPE "cms"."enum_tracker_hubs_status";
  DROP TYPE "cms"."enum__tracker_hubs_v_version_kind";
  DROP TYPE "cms"."enum__tracker_hubs_v_version_state";
  DROP TYPE "cms"."enum__tracker_hubs_v_version_source_tier";
  DROP TYPE "cms"."enum__tracker_hubs_v_version_status";`)
}
