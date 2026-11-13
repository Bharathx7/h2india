import { sql } from "drizzle-orm";
import { bigint, boolean, char, index, integer, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authorship, id, softDelete, timestamps, utc } from "../columns";
import { catalogueCategories } from "./catalogue";
import { core } from "./core";
import { organisations } from "./companies";

/**
 * Products (step 6.3; the supplier's editor is step 8.3). A product belongs to one supplier organisation and one
 * category (a category or a sub-category); its specifications are `attributes`, checked against that category's
 * schema (checkAttributeValues). Prices exist only for fixed-price items and show only on the product page (6.4);
 * quote-only items never hold a price. Statuses change only through changeStatus(): Draft → In review → Live, Paused.
 */
export const products = core.table(
  "products",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogueCategories.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    model: text("model"),
    /** The grey line under the name in tables, for example "Containerised · 40 ft". */
    variant: text("variant"),
    summary: text("summary"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
    /** Certificates and approvals named on the listing, for example ISO 22734, PESO approval. */
    certifications: text("certifications")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** quote (Request a quote) or fixed (a price on the product page, step 6.4). */
    pricing: text("pricing").notNull().default("quote"),
    /** Fixed-price items only, in paise. Never read outside the product page's price rule. */
    pricePaise: bigint("price_paise", { mode: "bigint" }),
    priceCurrency: char("price_currency", { length: 3 }),
    leadTimeMinWeeks: integer("lead_time_min_weeks"),
    leadTimeMaxWeeks: integer("lead_time_max_weeks"),
    madeInIndia: boolean("made_in_india").notNull().default(false),
    status: text("status").notNull().default("Draft"),
    publishedAt: utc("published_at"),
    sample: boolean("sample").notNull().default(false),
    ...timestamps,
    ...authorship,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("products_slug")
      .on(t.slug)
      .where(sql`${t.deletedAt} is null`),
    index("products_category").on(t.categoryId, t.status),
    index("products_organisation").on(t.organisationId),
    index("products_attributes").using("gin", t.attributes),
  ],
);
