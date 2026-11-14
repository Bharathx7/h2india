import { sql } from "drizzle-orm";
import { bigint, boolean, index, jsonb, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { organisationGstins, organisations } from "./companies";
import { core } from "./core";
import { products } from "./products";

// The buyer workspace (step 9.1; Figma page 13).

/** A receiving contact on a delivery site (575:331): gets the delivery code by SMS (step 10.9). */
export interface ReceivingContact {
  name: string;
  role: string;
  mobile: string;
}

/** Delivery sites (575:331, Add delivery site 580:152): they feed the RFQ wizard and checkout. Company-owned. */
export const deliverySites = core.table(
  "delivery_sites",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    gstinId: uuid("gstin_id").references(() => organisationGstins.id),
    hours: text("hours"),
    contacts: jsonb("contacts").$type<ReceivingContact[]>().notNull().default([]),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    deletedAt: utc("deleted_at"),
  },
  (t) => [index("delivery_sites_org").on(t.organisationId)],
);

/**
 * Approval rules and security (576:300, 576:662): stored now, enforced when transactions switch on (Stage 10).
 * Amounts in paise.
 */
export const buyerSettings = core.table("buyer_settings", {
  organisationId: uuid("organisation_id")
    .primaryKey()
    .references(() => organisations.id),
  approvalAbovePaise: bigint("approval_above_paise", { mode: "bigint" }),
  approverId: uuid("approver_id").references(() => users.id),
  secondApproval: boolean("second_approval").notNull().default(false),
  secondAbovePaise: bigint("second_above_paise", { mode: "bigint" }),
  secondApproverId: uuid("second_approver_id").references(() => users.id),
  /** Roles that must sign in with a passkey (576:662). */
  passkeyRoles: text("passkey_roles")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  checklistHidden: boolean("checklist_hidden").notNull().default(false),
  updatedAt: utc("updated_at")
    .notNull()
    .default(sql`now()`),
});

/** Delegation (576:300): an approver hands approvals to someone else for a period that ends on its own. */
export const approvalDelegations = core.table(
  "approval_delegations",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id),
    startsOn: utc("starts_on").notNull(),
    endsOn: utc("ends_on").notNull(),
    endedAt: utc("ended_at"),
  },
  (t) => [index("approval_delegations_org").on(t.organisationId)],
);

/** Project lists (Saved lists 78:2628; New list 275:23517): products shortlisted by a buyer company. */
export const projectLists = core.table(
  "project_lists",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    name: text("name").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    deletedAt: utc("deleted_at"),
  },
  (t) => [index("project_lists_org").on(t.organisationId)],
);

export const projectListItems = core.table(
  "project_list_items",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => projectLists.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    addedAt: utc("added_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.listId, t.productId] })],
);
