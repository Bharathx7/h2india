import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_schemes_who_can_apply" AS ENUM('Green hydrogen producers', 'Electrolyser manufacturers', 'Project developers', 'Research institutions', 'Start-ups', 'Manufacturers', 'State agencies');
  CREATE TYPE "cms"."enum_schemes_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_schemes_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum_schemes_status_override" AS ENUM('Closed', 'Next round expected');
  CREATE TYPE "cms"."enum_schemes_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__schemes_v_version_who_can_apply" AS ENUM('Green hydrogen producers', 'Electrolyser manufacturers', 'Project developers', 'Research institutions', 'Start-ups', 'Manufacturers', 'State agencies');
  CREATE TYPE "cms"."enum__schemes_v_version_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__schemes_v_version_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum__schemes_v_version_status_override" AS ENUM('Closed', 'Next round expected');
  CREATE TYPE "cms"."enum__schemes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_tenders_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_tenders_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum_tenders_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__tenders_v_version_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__tenders_v_version_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum__tenders_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_grants_themes" AS ENUM('Electrolysers', 'Storage', 'Fuel cells', 'Safety and standards', 'Materials', 'Transport', 'Industry');
  CREATE TYPE "cms"."enum_grants_who_can_apply" AS ENUM('Green hydrogen producers', 'Electrolyser manufacturers', 'Project developers', 'Research institutions', 'Start-ups', 'Manufacturers', 'State agencies');
  CREATE TYPE "cms"."enum_grants_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum_grants_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_grants_status_override" AS ENUM('Closed');
  CREATE TYPE "cms"."enum_grants_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__grants_v_version_themes" AS ENUM('Electrolysers', 'Storage', 'Fuel cells', 'Safety and standards', 'Materials', 'Transport', 'Industry');
  CREATE TYPE "cms"."enum__grants_v_version_who_can_apply" AS ENUM('Green hydrogen producers', 'Electrolyser manufacturers', 'Project developers', 'Research institutions', 'Start-ups', 'Manufacturers', 'State agencies');
  CREATE TYPE "cms"."enum__grants_v_version_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum__grants_v_version_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__grants_v_version_status_override" AS ENUM('Closed');
  CREATE TYPE "cms"."enum__grants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_jobs_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_jobs_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum_jobs_work_mode" AS ENUM('On site', 'Hybrid', 'Remote');
  CREATE TYPE "cms"."enum_jobs_experience" AS ENUM('0–2 years', '3–6 years', '7–10 years', '10+ years');
  CREATE TYPE "cms"."enum_jobs_how_to_apply" AS ENUM('link', 'email', 'form');
  CREATE TYPE "cms"."enum_jobs_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__jobs_v_version_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__jobs_v_version_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum__jobs_v_version_work_mode" AS ENUM('On site', 'Hybrid', 'Remote');
  CREATE TYPE "cms"."enum__jobs_v_version_experience" AS ENUM('0–2 years', '3–6 years', '7–10 years', '10+ years');
  CREATE TYPE "cms"."enum__jobs_v_version_how_to_apply" AS ENUM('link', 'email', 'form');
  CREATE TYPE "cms"."enum__jobs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_events_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum_events_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum_events_format" AS ENUM('Conference · in person', 'Workshop · in person', 'Expo · in person', 'Webinar · online', 'Hybrid');
  CREATE TYPE "cms"."enum_events_tickets" AS ENUM('Free', 'Paid');
  CREATE TYPE "cms"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__events_v_version_states" AS ENUM('all-india', 'andaman-and-nicobar-islands', 'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chandigarh', 'chhattisgarh', 'dadra-and-nagar-haveli-and-daman-and-diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jammu-and-kashmir', 'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu', 'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal');
  CREATE TYPE "cms"."enum__events_v_version_documents_kind" AS ENUM('PDF', 'Word', 'Excel', 'Web page');
  CREATE TYPE "cms"."enum__events_v_version_format" AS ENUM('Conference · in person', 'Workshop · in person', 'Expo · in person', 'Webinar · online', 'Hybrid');
  CREATE TYPE "cms"."enum__events_v_version_tickets" AS ENUM('Free', 'Paid');
  CREATE TYPE "cms"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_source_changes_status" AS ENUM('Open', 'Dismissed', 'Confirmed');
  CREATE TABLE "cms"."schemes_who_can_apply" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_who_can_apply",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_schemes_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."schemes_tranches" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mode" varchar,
  	"tranche" varchar,
  	"product" varchar,
  	"capacity" varchar,
  	"state" varchar
  );
  
  CREATE TABLE "cms"."schemes_eligibility" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"condition" varchar
  );
  
  CREATE TABLE "cms"."schemes_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"when" varchar,
  	"what" varchar
  );
  
  CREATE TABLE "cms"."schemes_documents_needed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"document" varchar
  );
  
  CREATE TABLE "cms"."schemes_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "cms"."schemes_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum_schemes_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."schemes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"run_by" varchar,
  	"ministry" varchar,
  	"next_deadline" timestamp(3) with time zone,
  	"deadline_note" varchar,
  	"status_override" "cms"."enum_schemes_status_override",
  	"summary" varchar,
  	"purpose" varchar,
  	"benefits" varchar,
  	"source_url" varchar,
  	"owner_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_schemes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."schemes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_schemes_v_version_who_can_apply" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_who_can_apply",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__schemes_v_version_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_schemes_v_version_tranches" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" varchar,
  	"tranche" varchar,
  	"product" varchar,
  	"capacity" varchar,
  	"state" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_eligibility" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"condition" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"when" varchar,
  	"what" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_documents_needed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"document" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum__schemes_v_version_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_schemes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_run_by" varchar,
  	"version_ministry" varchar,
  	"version_next_deadline" timestamp(3) with time zone,
  	"version_deadline_note" varchar,
  	"version_status_override" "cms"."enum__schemes_v_version_status_override",
  	"version_summary" varchar,
  	"version_purpose" varchar,
  	"version_benefits" varchar,
  	"version_source_url" varchar,
  	"version_owner_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__schemes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_schemes_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."tenders_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_tenders_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."tenders_key_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."tenders_eligibility" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"condition" varchar
  );
  
  CREATE TABLE "cms"."tenders_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum_tenders_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."tenders_corrigenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"date" timestamp(3) with time zone,
  	"change" varchar
  );
  
  CREATE TABLE "cms"."tenders_result_winners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"capacity" varchar,
  	"price" varchar
  );
  
  CREATE TABLE "cms"."tenders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"issuer" varchar,
  	"tender_id" varchar,
  	"mode" varchar,
  	"category" varchar,
  	"value" varchar,
  	"emd" varchar,
  	"document_fee" varchar,
  	"bid_due_at" timestamp(3) with time zone,
  	"description" varchar,
  	"source_url" varchar,
  	"result_declared_at" timestamp(3) with time zone,
  	"result_bidders" varchar,
  	"result_what_it_means" varchar,
  	"owner_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_tenders_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."tenders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_tenders_v_version_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__tenders_v_version_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_tenders_v_version_key_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tenders_v_version_eligibility" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"condition" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tenders_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum__tenders_v_version_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tenders_v_version_corrigenda" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"date" timestamp(3) with time zone,
  	"change" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tenders_v_version_result_winners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"capacity" varchar,
  	"price" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_tenders_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_issuer" varchar,
  	"version_tender_id" varchar,
  	"version_mode" varchar,
  	"version_category" varchar,
  	"version_value" varchar,
  	"version_emd" varchar,
  	"version_document_fee" varchar,
  	"version_bid_due_at" timestamp(3) with time zone,
  	"version_description" varchar,
  	"version_source_url" varchar,
  	"version_result_declared_at" timestamp(3) with time zone,
  	"version_result_bidders" varchar,
  	"version_result_what_it_means" varchar,
  	"version_owner_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__tenders_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_tenders_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."grants_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_grants_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."grants_who_can_apply" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_grants_who_can_apply",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."grants_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum_grants_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."grants_past_awardees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"project" varchar,
  	"year" varchar
  );
  
  CREATE TABLE "cms"."grants_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_grants_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."grants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"funder" varchar,
  	"amount_per_project" varchar,
  	"deadline" timestamp(3) with time zone,
  	"status_override" "cms"."enum_grants_status_override",
  	"how_to_apply" varchar,
  	"source_url" varchar,
  	"next_call_expected" varchar,
  	"owner_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_grants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."grants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_grants_v_version_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__grants_v_version_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_grants_v_version_who_can_apply" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__grants_v_version_who_can_apply",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_grants_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum__grants_v_version_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_grants_v_version_past_awardees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"project" varchar,
  	"year" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_grants_v_version_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__grants_v_version_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_grants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_funder" varchar,
  	"version_amount_per_project" varchar,
  	"version_deadline" timestamp(3) with time zone,
  	"version_status_override" "cms"."enum__grants_v_version_status_override",
  	"version_how_to_apply" varchar,
  	"version_source_url" varchar,
  	"version_next_call_expected" varchar,
  	"version_owner_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__grants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_grants_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."jobs_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_jobs_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."jobs_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum_jobs_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" varchar,
  	"slug" varchar,
  	"company" varchar,
  	"function" varchar,
  	"location" varchar,
  	"work_mode" "cms"."enum_jobs_work_mode" DEFAULT 'On site',
  	"experience" "cms"."enum_jobs_experience",
  	"salary_band" varchar,
  	"description" varchar,
  	"how_to_apply" "cms"."enum_jobs_how_to_apply" DEFAULT 'link',
  	"apply_email" varchar,
  	"posted_at" timestamp(3) with time zone,
  	"closes_at" timestamp(3) with time zone,
  	"featured" boolean,
  	"source_url" varchar,
  	"owner_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_jobs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."jobs_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."jobs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_jobs_v_version_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__jobs_v_version_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_jobs_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum__jobs_v_version_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_jobs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_role" varchar,
  	"version_slug" varchar,
  	"version_company" varchar,
  	"version_function" varchar,
  	"version_location" varchar,
  	"version_work_mode" "cms"."enum__jobs_v_version_work_mode" DEFAULT 'On site',
  	"version_experience" "cms"."enum__jobs_v_version_experience",
  	"version_salary_band" varchar,
  	"version_description" varchar,
  	"version_how_to_apply" "cms"."enum__jobs_v_version_how_to_apply" DEFAULT 'link',
  	"version_apply_email" varchar,
  	"version_posted_at" timestamp(3) with time zone,
  	"version_closes_at" timestamp(3) with time zone,
  	"version_featured" boolean,
  	"version_source_url" varchar,
  	"version_owner_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__jobs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_jobs_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."_jobs_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."events_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_events_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."events_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum_events_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"organiser" varchar,
  	"format" "cms"."enum_events_format",
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"venue" varchar,
  	"tickets" "cms"."enum_events_tickets" DEFAULT 'Free',
  	"price_text" varchar,
  	"registration_url" varchar,
  	"description" varchar,
  	"sponsored_placement" boolean,
  	"in_newsletter" boolean,
  	"source_url" varchar,
  	"owner_id" integer,
  	"verification_at" timestamp(3) with time zone,
  	"verification_by_id" integer,
  	"verification_note" varchar,
  	"sample" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."_events_v_version_states" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__events_v_version_states",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_events_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"kind" "cms"."enum__events_v_version_documents_kind" DEFAULT 'PDF',
  	"checked_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_organiser" varchar,
  	"version_format" "cms"."enum__events_v_version_format",
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_venue" varchar,
  	"version_tickets" "cms"."enum__events_v_version_tickets" DEFAULT 'Free',
  	"version_price_text" varchar,
  	"version_registration_url" varchar,
  	"version_description" varchar,
  	"version_sponsored_placement" boolean,
  	"version_in_newsletter" boolean,
  	"version_source_url" varchar,
  	"version_owner_id" integer,
  	"version_verification_at" timestamp(3) with time zone,
  	"version_verification_by_id" integer,
  	"version_verification_note" varchar,
  	"version_sample" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_events_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "cms"."source_changes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"before" varchar,
  	"now" varchar,
  	"detected_at" timestamp(3) with time zone NOT NULL,
  	"status" "cms"."enum_source_changes_status" DEFAULT 'Open' NOT NULL,
  	"decided_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."source_changes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"schemes_id" integer,
  	"tenders_id" integer,
  	"grants_id" integer,
  	"jobs_id" integer,
  	"events_id" integer
  );
  
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "schemes_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tenders_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "grants_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "jobs_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "source_changes_id" integer;
  ALTER TABLE "cms"."schemes_who_can_apply" ADD CONSTRAINT "schemes_who_can_apply_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_states" ADD CONSTRAINT "schemes_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_tranches" ADD CONSTRAINT "schemes_tranches_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_eligibility" ADD CONSTRAINT "schemes_eligibility_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_timeline" ADD CONSTRAINT "schemes_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_documents_needed" ADD CONSTRAINT "schemes_documents_needed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_faqs" ADD CONSTRAINT "schemes_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_documents" ADD CONSTRAINT "schemes_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes" ADD CONSTRAINT "schemes_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."schemes" ADD CONSTRAINT "schemes_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."schemes_rels" ADD CONSTRAINT "schemes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."schemes_rels" ADD CONSTRAINT "schemes_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_who_can_apply" ADD CONSTRAINT "_schemes_v_version_who_can_apply_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_states" ADD CONSTRAINT "_schemes_v_version_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_tranches" ADD CONSTRAINT "_schemes_v_version_tranches_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_eligibility" ADD CONSTRAINT "_schemes_v_version_eligibility_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_timeline" ADD CONSTRAINT "_schemes_v_version_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_documents_needed" ADD CONSTRAINT "_schemes_v_version_documents_needed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_faqs" ADD CONSTRAINT "_schemes_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_version_documents" ADD CONSTRAINT "_schemes_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v" ADD CONSTRAINT "_schemes_v_parent_id_schemes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."schemes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v" ADD CONSTRAINT "_schemes_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v" ADD CONSTRAINT "_schemes_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_rels" ADD CONSTRAINT "_schemes_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_schemes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_schemes_v_rels" ADD CONSTRAINT "_schemes_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_states" ADD CONSTRAINT "tenders_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_key_dates" ADD CONSTRAINT "tenders_key_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_eligibility" ADD CONSTRAINT "tenders_eligibility_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_documents" ADD CONSTRAINT "tenders_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_corrigenda" ADD CONSTRAINT "tenders_corrigenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_result_winners" ADD CONSTRAINT "tenders_result_winners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders" ADD CONSTRAINT "tenders_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tenders" ADD CONSTRAINT "tenders_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."tenders_rels" ADD CONSTRAINT "tenders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."tenders_rels" ADD CONSTRAINT "tenders_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_version_states" ADD CONSTRAINT "_tenders_v_version_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_version_key_dates" ADD CONSTRAINT "_tenders_v_version_key_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_version_eligibility" ADD CONSTRAINT "_tenders_v_version_eligibility_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_version_documents" ADD CONSTRAINT "_tenders_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_version_corrigenda" ADD CONSTRAINT "_tenders_v_version_corrigenda_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_version_result_winners" ADD CONSTRAINT "_tenders_v_version_result_winners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v" ADD CONSTRAINT "_tenders_v_parent_id_tenders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."tenders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v" ADD CONSTRAINT "_tenders_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v" ADD CONSTRAINT "_tenders_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_rels" ADD CONSTRAINT "_tenders_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_tenders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_tenders_v_rels" ADD CONSTRAINT "_tenders_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_themes" ADD CONSTRAINT "grants_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_who_can_apply" ADD CONSTRAINT "grants_who_can_apply_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_documents" ADD CONSTRAINT "grants_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_past_awardees" ADD CONSTRAINT "grants_past_awardees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_states" ADD CONSTRAINT "grants_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants" ADD CONSTRAINT "grants_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."grants" ADD CONSTRAINT "grants_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."grants_rels" ADD CONSTRAINT "grants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."grants_rels" ADD CONSTRAINT "grants_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_version_themes" ADD CONSTRAINT "_grants_v_version_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_version_who_can_apply" ADD CONSTRAINT "_grants_v_version_who_can_apply_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_version_documents" ADD CONSTRAINT "_grants_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_version_past_awardees" ADD CONSTRAINT "_grants_v_version_past_awardees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_version_states" ADD CONSTRAINT "_grants_v_version_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v" ADD CONSTRAINT "_grants_v_parent_id_grants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."grants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v" ADD CONSTRAINT "_grants_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v" ADD CONSTRAINT "_grants_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_rels" ADD CONSTRAINT "_grants_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_grants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_grants_v_rels" ADD CONSTRAINT "_grants_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs_states" ADD CONSTRAINT "jobs_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs_documents" ADD CONSTRAINT "jobs_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs" ADD CONSTRAINT "jobs_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."jobs" ADD CONSTRAINT "jobs_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."jobs_texts" ADD CONSTRAINT "jobs_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs_rels" ADD CONSTRAINT "jobs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."jobs_rels" ADD CONSTRAINT "jobs_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_version_states" ADD CONSTRAINT "_jobs_v_version_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_version_documents" ADD CONSTRAINT "_jobs_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v" ADD CONSTRAINT "_jobs_v_parent_id_jobs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v" ADD CONSTRAINT "_jobs_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v" ADD CONSTRAINT "_jobs_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_texts" ADD CONSTRAINT "_jobs_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_rels" ADD CONSTRAINT "_jobs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_jobs_v_rels" ADD CONSTRAINT "_jobs_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_states" ADD CONSTRAINT "events_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_documents" ADD CONSTRAINT "events_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events" ADD CONSTRAINT "events_owner_id_editors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."events" ADD CONSTRAINT "events_verification_by_id_editors_id_fk" FOREIGN KEY ("verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."events_rels" ADD CONSTRAINT "events_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_states" ADD CONSTRAINT "_events_v_version_states_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_version_documents" ADD CONSTRAINT "_events_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_events_v" ADD CONSTRAINT "_events_v_version_owner_id_editors_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_events_v" ADD CONSTRAINT "_events_v_version_verification_by_id_editors_id_fk" FOREIGN KEY ("version_verification_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_rels" ADD CONSTRAINT "_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_events_v_rels" ADD CONSTRAINT "_events_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "cms"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."source_changes" ADD CONSTRAINT "source_changes_decided_by_id_editors_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "cms"."editors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."source_changes_rels" ADD CONSTRAINT "source_changes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."source_changes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."source_changes_rels" ADD CONSTRAINT "source_changes_rels_schemes_fk" FOREIGN KEY ("schemes_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."source_changes_rels" ADD CONSTRAINT "source_changes_rels_tenders_fk" FOREIGN KEY ("tenders_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."source_changes_rels" ADD CONSTRAINT "source_changes_rels_grants_fk" FOREIGN KEY ("grants_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."source_changes_rels" ADD CONSTRAINT "source_changes_rels_jobs_fk" FOREIGN KEY ("jobs_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."source_changes_rels" ADD CONSTRAINT "source_changes_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "schemes_who_can_apply_order_idx" ON "cms"."schemes_who_can_apply" USING btree ("order");
  CREATE INDEX "schemes_who_can_apply_parent_idx" ON "cms"."schemes_who_can_apply" USING btree ("parent_id");
  CREATE INDEX "schemes_states_order_idx" ON "cms"."schemes_states" USING btree ("order");
  CREATE INDEX "schemes_states_parent_idx" ON "cms"."schemes_states" USING btree ("parent_id");
  CREATE INDEX "schemes_tranches_order_idx" ON "cms"."schemes_tranches" USING btree ("_order");
  CREATE INDEX "schemes_tranches_parent_id_idx" ON "cms"."schemes_tranches" USING btree ("_parent_id");
  CREATE INDEX "schemes_eligibility_order_idx" ON "cms"."schemes_eligibility" USING btree ("_order");
  CREATE INDEX "schemes_eligibility_parent_id_idx" ON "cms"."schemes_eligibility" USING btree ("_parent_id");
  CREATE INDEX "schemes_timeline_order_idx" ON "cms"."schemes_timeline" USING btree ("_order");
  CREATE INDEX "schemes_timeline_parent_id_idx" ON "cms"."schemes_timeline" USING btree ("_parent_id");
  CREATE INDEX "schemes_documents_needed_order_idx" ON "cms"."schemes_documents_needed" USING btree ("_order");
  CREATE INDEX "schemes_documents_needed_parent_id_idx" ON "cms"."schemes_documents_needed" USING btree ("_parent_id");
  CREATE INDEX "schemes_faqs_order_idx" ON "cms"."schemes_faqs" USING btree ("_order");
  CREATE INDEX "schemes_faqs_parent_id_idx" ON "cms"."schemes_faqs" USING btree ("_parent_id");
  CREATE INDEX "schemes_documents_order_idx" ON "cms"."schemes_documents" USING btree ("_order");
  CREATE INDEX "schemes_documents_parent_id_idx" ON "cms"."schemes_documents" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "schemes_slug_idx" ON "cms"."schemes" USING btree ("slug");
  CREATE INDEX "schemes_next_deadline_idx" ON "cms"."schemes" USING btree ("next_deadline");
  CREATE INDEX "schemes_owner_idx" ON "cms"."schemes" USING btree ("owner_id");
  CREATE INDEX "schemes_verification_verification_by_idx" ON "cms"."schemes" USING btree ("verification_by_id");
  CREATE INDEX "schemes_updated_at_idx" ON "cms"."schemes" USING btree ("updated_at");
  CREATE INDEX "schemes_created_at_idx" ON "cms"."schemes" USING btree ("created_at");
  CREATE INDEX "schemes__status_idx" ON "cms"."schemes" USING btree ("_status");
  CREATE INDEX "schemes_rels_order_idx" ON "cms"."schemes_rels" USING btree ("order");
  CREATE INDEX "schemes_rels_parent_idx" ON "cms"."schemes_rels" USING btree ("parent_id");
  CREATE INDEX "schemes_rels_path_idx" ON "cms"."schemes_rels" USING btree ("path");
  CREATE INDEX "schemes_rels_topics_id_idx" ON "cms"."schemes_rels" USING btree ("topics_id");
  CREATE INDEX "_schemes_v_version_who_can_apply_order_idx" ON "cms"."_schemes_v_version_who_can_apply" USING btree ("order");
  CREATE INDEX "_schemes_v_version_who_can_apply_parent_idx" ON "cms"."_schemes_v_version_who_can_apply" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_states_order_idx" ON "cms"."_schemes_v_version_states" USING btree ("order");
  CREATE INDEX "_schemes_v_version_states_parent_idx" ON "cms"."_schemes_v_version_states" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_tranches_order_idx" ON "cms"."_schemes_v_version_tranches" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_tranches_parent_id_idx" ON "cms"."_schemes_v_version_tranches" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_version_eligibility_order_idx" ON "cms"."_schemes_v_version_eligibility" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_eligibility_parent_id_idx" ON "cms"."_schemes_v_version_eligibility" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_version_timeline_order_idx" ON "cms"."_schemes_v_version_timeline" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_timeline_parent_id_idx" ON "cms"."_schemes_v_version_timeline" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_version_documents_needed_order_idx" ON "cms"."_schemes_v_version_documents_needed" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_documents_needed_parent_id_idx" ON "cms"."_schemes_v_version_documents_needed" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_version_faqs_order_idx" ON "cms"."_schemes_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_faqs_parent_id_idx" ON "cms"."_schemes_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_version_documents_order_idx" ON "cms"."_schemes_v_version_documents" USING btree ("_order");
  CREATE INDEX "_schemes_v_version_documents_parent_id_idx" ON "cms"."_schemes_v_version_documents" USING btree ("_parent_id");
  CREATE INDEX "_schemes_v_parent_idx" ON "cms"."_schemes_v" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_version_version_slug_idx" ON "cms"."_schemes_v" USING btree ("version_slug");
  CREATE INDEX "_schemes_v_version_version_next_deadline_idx" ON "cms"."_schemes_v" USING btree ("version_next_deadline");
  CREATE INDEX "_schemes_v_version_version_owner_idx" ON "cms"."_schemes_v" USING btree ("version_owner_id");
  CREATE INDEX "_schemes_v_version_verification_version_verification_by_idx" ON "cms"."_schemes_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_schemes_v_version_version_updated_at_idx" ON "cms"."_schemes_v" USING btree ("version_updated_at");
  CREATE INDEX "_schemes_v_version_version_created_at_idx" ON "cms"."_schemes_v" USING btree ("version_created_at");
  CREATE INDEX "_schemes_v_version_version__status_idx" ON "cms"."_schemes_v" USING btree ("version__status");
  CREATE INDEX "_schemes_v_created_at_idx" ON "cms"."_schemes_v" USING btree ("created_at");
  CREATE INDEX "_schemes_v_updated_at_idx" ON "cms"."_schemes_v" USING btree ("updated_at");
  CREATE INDEX "_schemes_v_latest_idx" ON "cms"."_schemes_v" USING btree ("latest");
  CREATE INDEX "_schemes_v_rels_order_idx" ON "cms"."_schemes_v_rels" USING btree ("order");
  CREATE INDEX "_schemes_v_rels_parent_idx" ON "cms"."_schemes_v_rels" USING btree ("parent_id");
  CREATE INDEX "_schemes_v_rels_path_idx" ON "cms"."_schemes_v_rels" USING btree ("path");
  CREATE INDEX "_schemes_v_rels_topics_id_idx" ON "cms"."_schemes_v_rels" USING btree ("topics_id");
  CREATE INDEX "tenders_states_order_idx" ON "cms"."tenders_states" USING btree ("order");
  CREATE INDEX "tenders_states_parent_idx" ON "cms"."tenders_states" USING btree ("parent_id");
  CREATE INDEX "tenders_key_dates_order_idx" ON "cms"."tenders_key_dates" USING btree ("_order");
  CREATE INDEX "tenders_key_dates_parent_id_idx" ON "cms"."tenders_key_dates" USING btree ("_parent_id");
  CREATE INDEX "tenders_eligibility_order_idx" ON "cms"."tenders_eligibility" USING btree ("_order");
  CREATE INDEX "tenders_eligibility_parent_id_idx" ON "cms"."tenders_eligibility" USING btree ("_parent_id");
  CREATE INDEX "tenders_documents_order_idx" ON "cms"."tenders_documents" USING btree ("_order");
  CREATE INDEX "tenders_documents_parent_id_idx" ON "cms"."tenders_documents" USING btree ("_parent_id");
  CREATE INDEX "tenders_corrigenda_order_idx" ON "cms"."tenders_corrigenda" USING btree ("_order");
  CREATE INDEX "tenders_corrigenda_parent_id_idx" ON "cms"."tenders_corrigenda" USING btree ("_parent_id");
  CREATE INDEX "tenders_result_winners_order_idx" ON "cms"."tenders_result_winners" USING btree ("_order");
  CREATE INDEX "tenders_result_winners_parent_id_idx" ON "cms"."tenders_result_winners" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tenders_slug_idx" ON "cms"."tenders" USING btree ("slug");
  CREATE INDEX "tenders_tender_id_idx" ON "cms"."tenders" USING btree ("tender_id");
  CREATE INDEX "tenders_bid_due_at_idx" ON "cms"."tenders" USING btree ("bid_due_at");
  CREATE INDEX "tenders_result_result_declared_at_idx" ON "cms"."tenders" USING btree ("result_declared_at");
  CREATE INDEX "tenders_owner_idx" ON "cms"."tenders" USING btree ("owner_id");
  CREATE INDEX "tenders_verification_verification_by_idx" ON "cms"."tenders" USING btree ("verification_by_id");
  CREATE INDEX "tenders_updated_at_idx" ON "cms"."tenders" USING btree ("updated_at");
  CREATE INDEX "tenders_created_at_idx" ON "cms"."tenders" USING btree ("created_at");
  CREATE INDEX "tenders__status_idx" ON "cms"."tenders" USING btree ("_status");
  CREATE INDEX "tenders_rels_order_idx" ON "cms"."tenders_rels" USING btree ("order");
  CREATE INDEX "tenders_rels_parent_idx" ON "cms"."tenders_rels" USING btree ("parent_id");
  CREATE INDEX "tenders_rels_path_idx" ON "cms"."tenders_rels" USING btree ("path");
  CREATE INDEX "tenders_rels_topics_id_idx" ON "cms"."tenders_rels" USING btree ("topics_id");
  CREATE INDEX "_tenders_v_version_states_order_idx" ON "cms"."_tenders_v_version_states" USING btree ("order");
  CREATE INDEX "_tenders_v_version_states_parent_idx" ON "cms"."_tenders_v_version_states" USING btree ("parent_id");
  CREATE INDEX "_tenders_v_version_key_dates_order_idx" ON "cms"."_tenders_v_version_key_dates" USING btree ("_order");
  CREATE INDEX "_tenders_v_version_key_dates_parent_id_idx" ON "cms"."_tenders_v_version_key_dates" USING btree ("_parent_id");
  CREATE INDEX "_tenders_v_version_eligibility_order_idx" ON "cms"."_tenders_v_version_eligibility" USING btree ("_order");
  CREATE INDEX "_tenders_v_version_eligibility_parent_id_idx" ON "cms"."_tenders_v_version_eligibility" USING btree ("_parent_id");
  CREATE INDEX "_tenders_v_version_documents_order_idx" ON "cms"."_tenders_v_version_documents" USING btree ("_order");
  CREATE INDEX "_tenders_v_version_documents_parent_id_idx" ON "cms"."_tenders_v_version_documents" USING btree ("_parent_id");
  CREATE INDEX "_tenders_v_version_corrigenda_order_idx" ON "cms"."_tenders_v_version_corrigenda" USING btree ("_order");
  CREATE INDEX "_tenders_v_version_corrigenda_parent_id_idx" ON "cms"."_tenders_v_version_corrigenda" USING btree ("_parent_id");
  CREATE INDEX "_tenders_v_version_result_winners_order_idx" ON "cms"."_tenders_v_version_result_winners" USING btree ("_order");
  CREATE INDEX "_tenders_v_version_result_winners_parent_id_idx" ON "cms"."_tenders_v_version_result_winners" USING btree ("_parent_id");
  CREATE INDEX "_tenders_v_parent_idx" ON "cms"."_tenders_v" USING btree ("parent_id");
  CREATE INDEX "_tenders_v_version_version_slug_idx" ON "cms"."_tenders_v" USING btree ("version_slug");
  CREATE INDEX "_tenders_v_version_version_tender_id_idx" ON "cms"."_tenders_v" USING btree ("version_tender_id");
  CREATE INDEX "_tenders_v_version_version_bid_due_at_idx" ON "cms"."_tenders_v" USING btree ("version_bid_due_at");
  CREATE INDEX "_tenders_v_version_result_version_result_declared_at_idx" ON "cms"."_tenders_v" USING btree ("version_result_declared_at");
  CREATE INDEX "_tenders_v_version_version_owner_idx" ON "cms"."_tenders_v" USING btree ("version_owner_id");
  CREATE INDEX "_tenders_v_version_verification_version_verification_by_idx" ON "cms"."_tenders_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_tenders_v_version_version_updated_at_idx" ON "cms"."_tenders_v" USING btree ("version_updated_at");
  CREATE INDEX "_tenders_v_version_version_created_at_idx" ON "cms"."_tenders_v" USING btree ("version_created_at");
  CREATE INDEX "_tenders_v_version_version__status_idx" ON "cms"."_tenders_v" USING btree ("version__status");
  CREATE INDEX "_tenders_v_created_at_idx" ON "cms"."_tenders_v" USING btree ("created_at");
  CREATE INDEX "_tenders_v_updated_at_idx" ON "cms"."_tenders_v" USING btree ("updated_at");
  CREATE INDEX "_tenders_v_latest_idx" ON "cms"."_tenders_v" USING btree ("latest");
  CREATE INDEX "_tenders_v_rels_order_idx" ON "cms"."_tenders_v_rels" USING btree ("order");
  CREATE INDEX "_tenders_v_rels_parent_idx" ON "cms"."_tenders_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tenders_v_rels_path_idx" ON "cms"."_tenders_v_rels" USING btree ("path");
  CREATE INDEX "_tenders_v_rels_topics_id_idx" ON "cms"."_tenders_v_rels" USING btree ("topics_id");
  CREATE INDEX "grants_themes_order_idx" ON "cms"."grants_themes" USING btree ("order");
  CREATE INDEX "grants_themes_parent_idx" ON "cms"."grants_themes" USING btree ("parent_id");
  CREATE INDEX "grants_who_can_apply_order_idx" ON "cms"."grants_who_can_apply" USING btree ("order");
  CREATE INDEX "grants_who_can_apply_parent_idx" ON "cms"."grants_who_can_apply" USING btree ("parent_id");
  CREATE INDEX "grants_documents_order_idx" ON "cms"."grants_documents" USING btree ("_order");
  CREATE INDEX "grants_documents_parent_id_idx" ON "cms"."grants_documents" USING btree ("_parent_id");
  CREATE INDEX "grants_past_awardees_order_idx" ON "cms"."grants_past_awardees" USING btree ("_order");
  CREATE INDEX "grants_past_awardees_parent_id_idx" ON "cms"."grants_past_awardees" USING btree ("_parent_id");
  CREATE INDEX "grants_states_order_idx" ON "cms"."grants_states" USING btree ("order");
  CREATE INDEX "grants_states_parent_idx" ON "cms"."grants_states" USING btree ("parent_id");
  CREATE UNIQUE INDEX "grants_slug_idx" ON "cms"."grants" USING btree ("slug");
  CREATE INDEX "grants_deadline_idx" ON "cms"."grants" USING btree ("deadline");
  CREATE INDEX "grants_owner_idx" ON "cms"."grants" USING btree ("owner_id");
  CREATE INDEX "grants_verification_verification_by_idx" ON "cms"."grants" USING btree ("verification_by_id");
  CREATE INDEX "grants_updated_at_idx" ON "cms"."grants" USING btree ("updated_at");
  CREATE INDEX "grants_created_at_idx" ON "cms"."grants" USING btree ("created_at");
  CREATE INDEX "grants__status_idx" ON "cms"."grants" USING btree ("_status");
  CREATE INDEX "grants_rels_order_idx" ON "cms"."grants_rels" USING btree ("order");
  CREATE INDEX "grants_rels_parent_idx" ON "cms"."grants_rels" USING btree ("parent_id");
  CREATE INDEX "grants_rels_path_idx" ON "cms"."grants_rels" USING btree ("path");
  CREATE INDEX "grants_rels_topics_id_idx" ON "cms"."grants_rels" USING btree ("topics_id");
  CREATE INDEX "_grants_v_version_themes_order_idx" ON "cms"."_grants_v_version_themes" USING btree ("order");
  CREATE INDEX "_grants_v_version_themes_parent_idx" ON "cms"."_grants_v_version_themes" USING btree ("parent_id");
  CREATE INDEX "_grants_v_version_who_can_apply_order_idx" ON "cms"."_grants_v_version_who_can_apply" USING btree ("order");
  CREATE INDEX "_grants_v_version_who_can_apply_parent_idx" ON "cms"."_grants_v_version_who_can_apply" USING btree ("parent_id");
  CREATE INDEX "_grants_v_version_documents_order_idx" ON "cms"."_grants_v_version_documents" USING btree ("_order");
  CREATE INDEX "_grants_v_version_documents_parent_id_idx" ON "cms"."_grants_v_version_documents" USING btree ("_parent_id");
  CREATE INDEX "_grants_v_version_past_awardees_order_idx" ON "cms"."_grants_v_version_past_awardees" USING btree ("_order");
  CREATE INDEX "_grants_v_version_past_awardees_parent_id_idx" ON "cms"."_grants_v_version_past_awardees" USING btree ("_parent_id");
  CREATE INDEX "_grants_v_version_states_order_idx" ON "cms"."_grants_v_version_states" USING btree ("order");
  CREATE INDEX "_grants_v_version_states_parent_idx" ON "cms"."_grants_v_version_states" USING btree ("parent_id");
  CREATE INDEX "_grants_v_parent_idx" ON "cms"."_grants_v" USING btree ("parent_id");
  CREATE INDEX "_grants_v_version_version_slug_idx" ON "cms"."_grants_v" USING btree ("version_slug");
  CREATE INDEX "_grants_v_version_version_deadline_idx" ON "cms"."_grants_v" USING btree ("version_deadline");
  CREATE INDEX "_grants_v_version_version_owner_idx" ON "cms"."_grants_v" USING btree ("version_owner_id");
  CREATE INDEX "_grants_v_version_verification_version_verification_by_idx" ON "cms"."_grants_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_grants_v_version_version_updated_at_idx" ON "cms"."_grants_v" USING btree ("version_updated_at");
  CREATE INDEX "_grants_v_version_version_created_at_idx" ON "cms"."_grants_v" USING btree ("version_created_at");
  CREATE INDEX "_grants_v_version_version__status_idx" ON "cms"."_grants_v" USING btree ("version__status");
  CREATE INDEX "_grants_v_created_at_idx" ON "cms"."_grants_v" USING btree ("created_at");
  CREATE INDEX "_grants_v_updated_at_idx" ON "cms"."_grants_v" USING btree ("updated_at");
  CREATE INDEX "_grants_v_latest_idx" ON "cms"."_grants_v" USING btree ("latest");
  CREATE INDEX "_grants_v_rels_order_idx" ON "cms"."_grants_v_rels" USING btree ("order");
  CREATE INDEX "_grants_v_rels_parent_idx" ON "cms"."_grants_v_rels" USING btree ("parent_id");
  CREATE INDEX "_grants_v_rels_path_idx" ON "cms"."_grants_v_rels" USING btree ("path");
  CREATE INDEX "_grants_v_rels_topics_id_idx" ON "cms"."_grants_v_rels" USING btree ("topics_id");
  CREATE INDEX "jobs_states_order_idx" ON "cms"."jobs_states" USING btree ("order");
  CREATE INDEX "jobs_states_parent_idx" ON "cms"."jobs_states" USING btree ("parent_id");
  CREATE INDEX "jobs_documents_order_idx" ON "cms"."jobs_documents" USING btree ("_order");
  CREATE INDEX "jobs_documents_parent_id_idx" ON "cms"."jobs_documents" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "jobs_slug_idx" ON "cms"."jobs" USING btree ("slug");
  CREATE INDEX "jobs_posted_at_idx" ON "cms"."jobs" USING btree ("posted_at");
  CREATE INDEX "jobs_closes_at_idx" ON "cms"."jobs" USING btree ("closes_at");
  CREATE INDEX "jobs_owner_idx" ON "cms"."jobs" USING btree ("owner_id");
  CREATE INDEX "jobs_verification_verification_by_idx" ON "cms"."jobs" USING btree ("verification_by_id");
  CREATE INDEX "jobs_updated_at_idx" ON "cms"."jobs" USING btree ("updated_at");
  CREATE INDEX "jobs_created_at_idx" ON "cms"."jobs" USING btree ("created_at");
  CREATE INDEX "jobs__status_idx" ON "cms"."jobs" USING btree ("_status");
  CREATE INDEX "jobs_texts_order_parent" ON "cms"."jobs_texts" USING btree ("order","parent_id");
  CREATE INDEX "jobs_rels_order_idx" ON "cms"."jobs_rels" USING btree ("order");
  CREATE INDEX "jobs_rels_parent_idx" ON "cms"."jobs_rels" USING btree ("parent_id");
  CREATE INDEX "jobs_rels_path_idx" ON "cms"."jobs_rels" USING btree ("path");
  CREATE INDEX "jobs_rels_topics_id_idx" ON "cms"."jobs_rels" USING btree ("topics_id");
  CREATE INDEX "_jobs_v_version_states_order_idx" ON "cms"."_jobs_v_version_states" USING btree ("order");
  CREATE INDEX "_jobs_v_version_states_parent_idx" ON "cms"."_jobs_v_version_states" USING btree ("parent_id");
  CREATE INDEX "_jobs_v_version_documents_order_idx" ON "cms"."_jobs_v_version_documents" USING btree ("_order");
  CREATE INDEX "_jobs_v_version_documents_parent_id_idx" ON "cms"."_jobs_v_version_documents" USING btree ("_parent_id");
  CREATE INDEX "_jobs_v_parent_idx" ON "cms"."_jobs_v" USING btree ("parent_id");
  CREATE INDEX "_jobs_v_version_version_slug_idx" ON "cms"."_jobs_v" USING btree ("version_slug");
  CREATE INDEX "_jobs_v_version_version_posted_at_idx" ON "cms"."_jobs_v" USING btree ("version_posted_at");
  CREATE INDEX "_jobs_v_version_version_closes_at_idx" ON "cms"."_jobs_v" USING btree ("version_closes_at");
  CREATE INDEX "_jobs_v_version_version_owner_idx" ON "cms"."_jobs_v" USING btree ("version_owner_id");
  CREATE INDEX "_jobs_v_version_verification_version_verification_by_idx" ON "cms"."_jobs_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_jobs_v_version_version_updated_at_idx" ON "cms"."_jobs_v" USING btree ("version_updated_at");
  CREATE INDEX "_jobs_v_version_version_created_at_idx" ON "cms"."_jobs_v" USING btree ("version_created_at");
  CREATE INDEX "_jobs_v_version_version__status_idx" ON "cms"."_jobs_v" USING btree ("version__status");
  CREATE INDEX "_jobs_v_created_at_idx" ON "cms"."_jobs_v" USING btree ("created_at");
  CREATE INDEX "_jobs_v_updated_at_idx" ON "cms"."_jobs_v" USING btree ("updated_at");
  CREATE INDEX "_jobs_v_latest_idx" ON "cms"."_jobs_v" USING btree ("latest");
  CREATE INDEX "_jobs_v_texts_order_parent" ON "cms"."_jobs_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_jobs_v_rels_order_idx" ON "cms"."_jobs_v_rels" USING btree ("order");
  CREATE INDEX "_jobs_v_rels_parent_idx" ON "cms"."_jobs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_jobs_v_rels_path_idx" ON "cms"."_jobs_v_rels" USING btree ("path");
  CREATE INDEX "_jobs_v_rels_topics_id_idx" ON "cms"."_jobs_v_rels" USING btree ("topics_id");
  CREATE INDEX "events_states_order_idx" ON "cms"."events_states" USING btree ("order");
  CREATE INDEX "events_states_parent_idx" ON "cms"."events_states" USING btree ("parent_id");
  CREATE INDEX "events_documents_order_idx" ON "cms"."events_documents" USING btree ("_order");
  CREATE INDEX "events_documents_parent_id_idx" ON "cms"."events_documents" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "cms"."events" USING btree ("slug");
  CREATE INDEX "events_starts_at_idx" ON "cms"."events" USING btree ("starts_at");
  CREATE INDEX "events_ends_at_idx" ON "cms"."events" USING btree ("ends_at");
  CREATE INDEX "events_owner_idx" ON "cms"."events" USING btree ("owner_id");
  CREATE INDEX "events_verification_verification_by_idx" ON "cms"."events" USING btree ("verification_by_id");
  CREATE INDEX "events_updated_at_idx" ON "cms"."events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "cms"."events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "cms"."events" USING btree ("_status");
  CREATE INDEX "events_rels_order_idx" ON "cms"."events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "cms"."events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "cms"."events_rels" USING btree ("path");
  CREATE INDEX "events_rels_topics_id_idx" ON "cms"."events_rels" USING btree ("topics_id");
  CREATE INDEX "_events_v_version_states_order_idx" ON "cms"."_events_v_version_states" USING btree ("order");
  CREATE INDEX "_events_v_version_states_parent_idx" ON "cms"."_events_v_version_states" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_documents_order_idx" ON "cms"."_events_v_version_documents" USING btree ("_order");
  CREATE INDEX "_events_v_version_documents_parent_id_idx" ON "cms"."_events_v_version_documents" USING btree ("_parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "cms"."_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "cms"."_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_starts_at_idx" ON "cms"."_events_v" USING btree ("version_starts_at");
  CREATE INDEX "_events_v_version_version_ends_at_idx" ON "cms"."_events_v" USING btree ("version_ends_at");
  CREATE INDEX "_events_v_version_version_owner_idx" ON "cms"."_events_v" USING btree ("version_owner_id");
  CREATE INDEX "_events_v_version_verification_version_verification_by_idx" ON "cms"."_events_v" USING btree ("version_verification_by_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "cms"."_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "cms"."_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "cms"."_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "cms"."_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "cms"."_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "cms"."_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_rels_order_idx" ON "cms"."_events_v_rels" USING btree ("order");
  CREATE INDEX "_events_v_rels_parent_idx" ON "cms"."_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_events_v_rels_path_idx" ON "cms"."_events_v_rels" USING btree ("path");
  CREATE INDEX "_events_v_rels_topics_id_idx" ON "cms"."_events_v_rels" USING btree ("topics_id");
  CREATE INDEX "source_changes_decided_by_idx" ON "cms"."source_changes" USING btree ("decided_by_id");
  CREATE INDEX "source_changes_updated_at_idx" ON "cms"."source_changes" USING btree ("updated_at");
  CREATE INDEX "source_changes_created_at_idx" ON "cms"."source_changes" USING btree ("created_at");
  CREATE INDEX "source_changes_rels_order_idx" ON "cms"."source_changes_rels" USING btree ("order");
  CREATE INDEX "source_changes_rels_parent_idx" ON "cms"."source_changes_rels" USING btree ("parent_id");
  CREATE INDEX "source_changes_rels_path_idx" ON "cms"."source_changes_rels" USING btree ("path");
  CREATE INDEX "source_changes_rels_schemes_id_idx" ON "cms"."source_changes_rels" USING btree ("schemes_id");
  CREATE INDEX "source_changes_rels_tenders_id_idx" ON "cms"."source_changes_rels" USING btree ("tenders_id");
  CREATE INDEX "source_changes_rels_grants_id_idx" ON "cms"."source_changes_rels" USING btree ("grants_id");
  CREATE INDEX "source_changes_rels_jobs_id_idx" ON "cms"."source_changes_rels" USING btree ("jobs_id");
  CREATE INDEX "source_changes_rels_events_id_idx" ON "cms"."source_changes_rels" USING btree ("events_id");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_schemes_fk" FOREIGN KEY ("schemes_id") REFERENCES "cms"."schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenders_fk" FOREIGN KEY ("tenders_id") REFERENCES "cms"."tenders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_grants_fk" FOREIGN KEY ("grants_id") REFERENCES "cms"."grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_jobs_fk" FOREIGN KEY ("jobs_id") REFERENCES "cms"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "cms"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_changes_fk" FOREIGN KEY ("source_changes_id") REFERENCES "cms"."source_changes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_schemes_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("schemes_id");
  CREATE INDEX "payload_locked_documents_rels_tenders_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tenders_id");
  CREATE INDEX "payload_locked_documents_rels_grants_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("grants_id");
  CREATE INDEX "payload_locked_documents_rels_jobs_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("jobs_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_source_changes_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("source_changes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."schemes_who_can_apply" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_tranches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_eligibility" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_timeline" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_documents_needed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."schemes_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_who_can_apply" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_tranches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_eligibility" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_timeline" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_documents_needed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_version_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_schemes_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_key_dates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_eligibility" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_corrigenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_result_winners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tenders_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_version_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_version_key_dates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_version_eligibility" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_version_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_version_corrigenda" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_version_result_winners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_tenders_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_themes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_who_can_apply" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_past_awardees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."grants_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_version_themes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_version_who_can_apply" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_version_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_version_past_awardees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_version_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_grants_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."jobs_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v_version_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v_version_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_jobs_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."events_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_version_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_events_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."source_changes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."source_changes_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."schemes_who_can_apply" CASCADE;
  DROP TABLE "cms"."schemes_states" CASCADE;
  DROP TABLE "cms"."schemes_tranches" CASCADE;
  DROP TABLE "cms"."schemes_eligibility" CASCADE;
  DROP TABLE "cms"."schemes_timeline" CASCADE;
  DROP TABLE "cms"."schemes_documents_needed" CASCADE;
  DROP TABLE "cms"."schemes_faqs" CASCADE;
  DROP TABLE "cms"."schemes_documents" CASCADE;
  DROP TABLE "cms"."schemes" CASCADE;
  DROP TABLE "cms"."schemes_rels" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_who_can_apply" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_states" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_tranches" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_eligibility" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_timeline" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_documents_needed" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_faqs" CASCADE;
  DROP TABLE "cms"."_schemes_v_version_documents" CASCADE;
  DROP TABLE "cms"."_schemes_v" CASCADE;
  DROP TABLE "cms"."_schemes_v_rels" CASCADE;
  DROP TABLE "cms"."tenders_states" CASCADE;
  DROP TABLE "cms"."tenders_key_dates" CASCADE;
  DROP TABLE "cms"."tenders_eligibility" CASCADE;
  DROP TABLE "cms"."tenders_documents" CASCADE;
  DROP TABLE "cms"."tenders_corrigenda" CASCADE;
  DROP TABLE "cms"."tenders_result_winners" CASCADE;
  DROP TABLE "cms"."tenders" CASCADE;
  DROP TABLE "cms"."tenders_rels" CASCADE;
  DROP TABLE "cms"."_tenders_v_version_states" CASCADE;
  DROP TABLE "cms"."_tenders_v_version_key_dates" CASCADE;
  DROP TABLE "cms"."_tenders_v_version_eligibility" CASCADE;
  DROP TABLE "cms"."_tenders_v_version_documents" CASCADE;
  DROP TABLE "cms"."_tenders_v_version_corrigenda" CASCADE;
  DROP TABLE "cms"."_tenders_v_version_result_winners" CASCADE;
  DROP TABLE "cms"."_tenders_v" CASCADE;
  DROP TABLE "cms"."_tenders_v_rels" CASCADE;
  DROP TABLE "cms"."grants_themes" CASCADE;
  DROP TABLE "cms"."grants_who_can_apply" CASCADE;
  DROP TABLE "cms"."grants_documents" CASCADE;
  DROP TABLE "cms"."grants_past_awardees" CASCADE;
  DROP TABLE "cms"."grants_states" CASCADE;
  DROP TABLE "cms"."grants" CASCADE;
  DROP TABLE "cms"."grants_rels" CASCADE;
  DROP TABLE "cms"."_grants_v_version_themes" CASCADE;
  DROP TABLE "cms"."_grants_v_version_who_can_apply" CASCADE;
  DROP TABLE "cms"."_grants_v_version_documents" CASCADE;
  DROP TABLE "cms"."_grants_v_version_past_awardees" CASCADE;
  DROP TABLE "cms"."_grants_v_version_states" CASCADE;
  DROP TABLE "cms"."_grants_v" CASCADE;
  DROP TABLE "cms"."_grants_v_rels" CASCADE;
  DROP TABLE "cms"."jobs_states" CASCADE;
  DROP TABLE "cms"."jobs_documents" CASCADE;
  DROP TABLE "cms"."jobs" CASCADE;
  DROP TABLE "cms"."jobs_texts" CASCADE;
  DROP TABLE "cms"."jobs_rels" CASCADE;
  DROP TABLE "cms"."_jobs_v_version_states" CASCADE;
  DROP TABLE "cms"."_jobs_v_version_documents" CASCADE;
  DROP TABLE "cms"."_jobs_v" CASCADE;
  DROP TABLE "cms"."_jobs_v_texts" CASCADE;
  DROP TABLE "cms"."_jobs_v_rels" CASCADE;
  DROP TABLE "cms"."events_states" CASCADE;
  DROP TABLE "cms"."events_documents" CASCADE;
  DROP TABLE "cms"."events" CASCADE;
  DROP TABLE "cms"."events_rels" CASCADE;
  DROP TABLE "cms"."_events_v_version_states" CASCADE;
  DROP TABLE "cms"."_events_v_version_documents" CASCADE;
  DROP TABLE "cms"."_events_v" CASCADE;
  DROP TABLE "cms"."_events_v_rels" CASCADE;
  DROP TABLE "cms"."source_changes" CASCADE;
  DROP TABLE "cms"."source_changes_rels" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_schemes_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tenders_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_grants_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_jobs_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_source_changes_fk";
  
  DROP INDEX "cms"."payload_locked_documents_rels_schemes_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tenders_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_grants_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_jobs_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_events_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_source_changes_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "schemes_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tenders_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "grants_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "jobs_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "source_changes_id";
  DROP TYPE "cms"."enum_schemes_who_can_apply";
  DROP TYPE "cms"."enum_schemes_states";
  DROP TYPE "cms"."enum_schemes_documents_kind";
  DROP TYPE "cms"."enum_schemes_status_override";
  DROP TYPE "cms"."enum_schemes_status";
  DROP TYPE "cms"."enum__schemes_v_version_who_can_apply";
  DROP TYPE "cms"."enum__schemes_v_version_states";
  DROP TYPE "cms"."enum__schemes_v_version_documents_kind";
  DROP TYPE "cms"."enum__schemes_v_version_status_override";
  DROP TYPE "cms"."enum__schemes_v_version_status";
  DROP TYPE "cms"."enum_tenders_states";
  DROP TYPE "cms"."enum_tenders_documents_kind";
  DROP TYPE "cms"."enum_tenders_status";
  DROP TYPE "cms"."enum__tenders_v_version_states";
  DROP TYPE "cms"."enum__tenders_v_version_documents_kind";
  DROP TYPE "cms"."enum__tenders_v_version_status";
  DROP TYPE "cms"."enum_grants_themes";
  DROP TYPE "cms"."enum_grants_who_can_apply";
  DROP TYPE "cms"."enum_grants_documents_kind";
  DROP TYPE "cms"."enum_grants_states";
  DROP TYPE "cms"."enum_grants_status_override";
  DROP TYPE "cms"."enum_grants_status";
  DROP TYPE "cms"."enum__grants_v_version_themes";
  DROP TYPE "cms"."enum__grants_v_version_who_can_apply";
  DROP TYPE "cms"."enum__grants_v_version_documents_kind";
  DROP TYPE "cms"."enum__grants_v_version_states";
  DROP TYPE "cms"."enum__grants_v_version_status_override";
  DROP TYPE "cms"."enum__grants_v_version_status";
  DROP TYPE "cms"."enum_jobs_states";
  DROP TYPE "cms"."enum_jobs_documents_kind";
  DROP TYPE "cms"."enum_jobs_work_mode";
  DROP TYPE "cms"."enum_jobs_experience";
  DROP TYPE "cms"."enum_jobs_how_to_apply";
  DROP TYPE "cms"."enum_jobs_status";
  DROP TYPE "cms"."enum__jobs_v_version_states";
  DROP TYPE "cms"."enum__jobs_v_version_documents_kind";
  DROP TYPE "cms"."enum__jobs_v_version_work_mode";
  DROP TYPE "cms"."enum__jobs_v_version_experience";
  DROP TYPE "cms"."enum__jobs_v_version_how_to_apply";
  DROP TYPE "cms"."enum__jobs_v_version_status";
  DROP TYPE "cms"."enum_events_states";
  DROP TYPE "cms"."enum_events_documents_kind";
  DROP TYPE "cms"."enum_events_format";
  DROP TYPE "cms"."enum_events_tickets";
  DROP TYPE "cms"."enum_events_status";
  DROP TYPE "cms"."enum__events_v_version_states";
  DROP TYPE "cms"."enum__events_v_version_documents_kind";
  DROP TYPE "cms"."enum__events_v_version_format";
  DROP TYPE "cms"."enum__events_v_version_tickets";
  DROP TYPE "cms"."enum__events_v_version_status";
  DROP TYPE "cms"."enum_source_changes_status";`)
}
