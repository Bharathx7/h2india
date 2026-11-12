import { boolean, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

// Permissions as data (step 3.4, playbook Section 10). Seeded from Figma 575:696, 592:371 and 656:8; the admin
// Operator roles screen (step 11.4) changes them without a deploy.

/** buyer | supplier roles for company members; operator roles for H2 India staff. */
export const roles = core.table(
  "roles",
  {
    id: id(),
    scope: text("scope").notNull(), // buyer | supplier | operator
    name: text("name").notNull(),
    description: text("description").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("roles_scope_name_unique").on(t.scope, t.name)],
);

export const permissions = core.table("permissions", {
  key: text("key").primaryKey(), // for example "order.approve" or "money.edit"
  layer: text("layer").notNull(), // company | operator
  description: text("description").notNull(),
  /** Moves money, shows bank or personal data, or changes who can do what (656:8). */
  sensitive: boolean("sensitive").notNull().default(false),
});

export const rolePermissions = core.table(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

/** Which H2 India staff hold which operator role. */
export const operatorRoles = core.table(
  "operator_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => users.id),
    createdAt: utc("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);
