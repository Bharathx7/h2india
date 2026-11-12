import type { CollectionConfig } from "payload";
import { h2indiaStrategy } from "../auth-strategy";
import { has } from "../roles";

// The CMS's users: operators with Content access, created on their first visit (A26). No passwords here.
export const Editors: CollectionConfig = {
  slug: "editors",
  labels: { singular: "Editor", plural: "Editors" },
  admin: { useAsTitle: "name", group: "People", defaultColumns: ["name", "role", "email"] },
  auth: { disableLocalStrategy: true, strategies: [h2indiaStrategy] },
  access: {
    admin: ({ req }) => has(req, "content.view"),
    read: ({ req }) => has(req, "content.view"),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "h2UserId", type: "text", required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: "name", type: "text", required: true, admin: { readOnly: true } },
    { name: "email", type: "email", required: true, admin: { readOnly: true } },
    {
      name: "role",
      type: "text",
      admin: { readOnly: true, description: "From the operator roles (Users and roles, step 11.4)." },
    },
  ],
};
