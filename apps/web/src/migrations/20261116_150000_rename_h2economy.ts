import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The brand is H2 Economy (founder, 16 Nov 2026): default texts that name it. Existing records keep their words;
// editors change them in the admin. Written by hand in the shape payload migrate:create makes (only defaults change).

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "cms"."articles" ALTER COLUMN "sponsor_disclosure" SET DEFAULT 'This article is paid for by the sponsor. H2 Economy''s editors checked its facts.';
  ALTER TABLE "cms"."_articles_v" ALTER COLUMN "version_sponsor_disclosure" SET DEFAULT 'This article is paid for by the sponsor. H2 Economy''s editors checked its facts.';
  ALTER TABLE "cms"."trust_settings" ALTER COLUMN "grievance_officer_designation" SET DEFAULT 'Grievance Officer, H2 Economy';
  ALTER TABLE "cms"."trust_settings" ALTER COLUMN "boilerplate" SET DEFAULT 'H2 Economy is India''s hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India''s hydrogen economy.';
  ALTER TABLE "cms"."_trust_settings_v" ALTER COLUMN "version_grievance_officer_designation" SET DEFAULT 'Grievance Officer, H2 Economy';
  ALTER TABLE "cms"."_trust_settings_v" ALTER COLUMN "version_boilerplate" SET DEFAULT 'H2 Economy is India''s hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India''s hydrogen economy.';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "cms"."articles" ALTER COLUMN "sponsor_disclosure" SET DEFAULT 'This article is paid for by the sponsor. H2 India''s editors checked its facts.';
  ALTER TABLE "cms"."_articles_v" ALTER COLUMN "version_sponsor_disclosure" SET DEFAULT 'This article is paid for by the sponsor. H2 India''s editors checked its facts.';
  ALTER TABLE "cms"."trust_settings" ALTER COLUMN "grievance_officer_designation" SET DEFAULT 'Grievance Officer, H2 India';
  ALTER TABLE "cms"."trust_settings" ALTER COLUMN "boilerplate" SET DEFAULT 'H2 India is India''s hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India''s hydrogen economy.';
  ALTER TABLE "cms"."_trust_settings_v" ALTER COLUMN "version_grievance_officer_designation" SET DEFAULT 'Grievance Officer, H2 India';
  ALTER TABLE "cms"."_trust_settings_v" ALTER COLUMN "version_boilerplate" SET DEFAULT 'H2 India is India''s hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India''s hydrogen economy.';`)
}
