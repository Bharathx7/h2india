import { jsonb, text, uuid } from "drizzle-orm/pg-core";
import { utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

// Platform settings changed by operators (step 3.6), for example the comingSoon switch (step 5.1). Every change
// writes an audit entry with the value before and after.
export const settings = core.table("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: utc("updated_at").notNull().defaultNow(),
});
