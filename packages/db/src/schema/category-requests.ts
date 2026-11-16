import { index, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { catalogueCategories, catalogueClasses } from "./catalogue";
import { organisations } from "./companies";
import { core } from "./core";

/**
 * A supplier's request for a category the catalogue doesn't have yet (supplier QC, 16 Nov 2026). An operator approves
 * it (which adds the category through the taxonomy, with the name and place they settle on) or rejects it with a
 * reason, in the Category requests queue. Status: Pending · Approved · Rejected, changed only through changeStatus().
 */
export const categoryRequests = core.table(
  "category_requests",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    /** Where the supplier suggests it goes: a class, and optionally the category it would sit under. */
    classId: text("class_id")
      .notNull()
      .references(() => catalogueClasses.id),
    parentId: uuid("parent_id").references(() => catalogueCategories.id),
    label: text("label").notNull(),
    description: text("description").notNull(),
    /** An example product the supplier wants to list in it. */
    example: text("example"),
    status: text("status").notNull().default("Pending"),
    /** The category the approval created (its name and place may differ from the request). */
    categoryId: uuid("category_id").references(() => catalogueCategories.id),
    reason: text("reason"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: utc("decided_at"),
    ...timestamps,
  },
  (t) => [
    index("category_requests_organisation").on(t.organisationId, t.createdAt),
    index("category_requests_status").on(t.status, t.createdAt),
  ],
);
