import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authorship, id, softDelete, timestamps, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

/**
 * The catalogue (step 6.1, Taxonomy 636:596). Five classes, then categories and sub-categories under them, the
 * browse-by-application axis, and one attribute schema per category. The schema drives the product form, the
 * filters, compare, the spec table, the CSV template and the datasheet reader, so these can never disagree.
 * Operators change it in admin Catalogue; every change is audit-logged and listed in catalogue_changes.
 */

/** Systems, Components, Equipment, Services, Materials. Fixed by the design; the id is the URL word. */
export const catalogueClasses = core.table("catalogue_classes", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  /** The line on the marketplace tile (390:7501). */
  description: text("description").notNull(),
  position: integer("position").notNull(),
});

/**
 * A category (parent empty) or a sub-category (parent set). Hidden categories stay in the data (products keep their
 * place) but are left out of every public list. Sample rows show only with FLAG_SAMPLE_CONTENT (F9).
 */
export const catalogueCategories = core.table(
  "catalogue_categories",
  {
    id: id(),
    classId: text("class_id")
      .notNull()
      .references(() => catalogueClasses.id),
    parentId: uuid("parent_id").references((): AnyPgColumn => catalogueCategories.id),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    /** The intro paragraph on the listing page (392:5787; Doc 3 category landing copy, A146). */
    description: text("description"),
    position: integer("position").notNull().default(0),
    hiddenAt: utc("hidden_at"),
    sample: boolean("sample").notNull().default(false),
    ...timestamps,
    ...authorship,
    ...softDelete,
  },
  (t) => [
    // A slug is unique among its siblings, so /marketplace/<class>/<category>/<sub-category> is unambiguous.
    uniqueIndex("catalogue_categories_slug")
      .on(t.classId, sql`coalesce(${t.parentId}, '00000000-0000-0000-0000-000000000000'::uuid)`, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index("catalogue_categories_parent").on(t.parentId),
  ],
);

/** Browse by application (390:7501): seven applications across the classes. */
export const catalogueApplications = core.table("catalogue_applications", {
  id: text("id").primaryKey(),
  /** As on the marketplace landing, for example "Green hydrogen production". */
  label: text("label").notNull(),
  /** As on the home tiles and the mega menu, for example "Production". */
  shortLabel: text("short_label").notNull(),
  /** The examples under the name on the home tile (850:209). */
  examples: text("examples").notNull().default(""),
  position: integer("position").notNull(),
  hiddenAt: utc("hidden_at"),
});

export const catalogueCategoryApplications = core.table(
  "catalogue_category_applications",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogueCategories.id),
    applicationId: text("application_id")
      .notNull()
      .references(() => catalogueApplications.id),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.applicationId] })],
);

/**
 * One field in a category's schema (Add attribute 637:417). The key is fixed once made (products store values under
 * it); the label can be renamed freely. Type and unit can't change once products use the attribute (step 6.1).
 */
export const catalogueAttributes = core.table(
  "catalogue_attributes",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogueCategories.id),
    key: text("key").notNull(),
    label: text("label").notNull(),
    /** number, range, text, choice, boolean */
    type: text("type").notNull(),
    unit: text("unit"),
    /** Allowed range for number and range types. */
    min: doublePrecision("min"),
    max: doublePrecision("max"),
    /** The choices for a choice attribute. */
    options: text("options")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** A hint for text attributes, for example "L × W" (shown in Allowed values). */
    hint: text("hint"),
    required: boolean("required").notNull().default(false),
    filterable: boolean("filterable").notNull().default(false),
    comparable: boolean("comparable").notNull().default(false),
    /** When set, suppliers are asked for the test condition and it shows next to the value ("72 dB(A) at 1 m"). */
    testCondition: text("test_condition"),
    /** The spec table group: Performance, Gas quality, Physical ... */
    displayGroup: text("display_group").notNull(),
    position: integer("position").notNull().default(0),
    sample: boolean("sample").notNull().default(false),
    ...timestamps,
    ...authorship,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("catalogue_attributes_key")
      .on(t.categoryId, t.key)
      .where(sql`${t.deletedAt} is null`),
    index("catalogue_attributes_category").on(t.categoryId, t.position),
  ],
);

/**
 * Change history on the Taxonomy screen (636:596): one plain sentence per change, newest first. The audit log keeps
 * the before and after values; this keeps what the screen shows, readable with catalogue.view.
 */
export const catalogueChanges = core.table(
  "catalogue_changes",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogueCategories.id),
    actorId: uuid("actor_id").references(() => users.id),
    summary: text("summary").notNull(),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("catalogue_changes_category").on(t.categoryId, t.at)],
);
