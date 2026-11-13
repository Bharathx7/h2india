import { sql } from "drizzle-orm";
import { boolean, date, index, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, softDelete, timestamps, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";

/**
 * Brands (step 6.5; index 401:11734, brand page 401:12097): makers whose products are sold on H2 India, Indian or
 * international, with their authorised Indian dealers. A dealer shows as Verified only once an operator has recorded
 * the evidence (the authorisation letter) and only while the letter is valid (playbook watch-out, A128).
 */
export const brands = core.table(
  "brands",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Country of origin, for example Germany or India. */
    origin: text("origin").notNull(),
    ownerName: text("owner_name"),
    ownerUrl: text("owner_url"),
    description: text("description"),
    sample: boolean("sample").notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("brands_slug")
      .on(t.slug)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const brandDealers = core.table(
  "brand_dealers",
  {
    id: id(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** "West and South India", "all India" */
    regions: text("regions"),
    /** "spares and service only" */
    scope: text("scope"),
    letterValidUntil: date("letter_valid_until"),
    /** The authorisation letter in the files service. */
    evidenceFileId: text("evidence_file_id"),
    /** Set by an operator in the Verification desk after checking the letter; the badge shows only then. */
    verifiedAt: utc("verified_at"),
    verifiedBy: uuid("verified_by").references(() => users.id),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("brand_dealers_pair").on(t.brandId, t.organisationId),
    index("brand_dealers_org").on(t.organisationId),
  ],
);

/** A signed-in person's compare selection, kept on the server too (step 6.5). */
export const compareLists = core.table("compare_lists", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  productIds: text("product_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  updatedAt: utc("updated_at")
    .notNull()
    .default(sql`now()`),
});
