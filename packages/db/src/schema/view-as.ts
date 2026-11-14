import { sql } from "drizzle-orm";
import { index, text, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

/**
 * View as user (657:328, 657:486; step 11.4): an operator sees the site as a person, read-only, for a few minutes, with
 * a recorded reason. Never "log in as": every write is refused while it lasts, and the token is stored hashed.
 */
export const viewAsGrants = core.table(
  "view_as_grants",
  {
    id: id(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => users.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: utc("expires_at").notNull(),
    endedAt: utc("ended_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("view_as_grants_operator").on(t.operatorId, t.createdAt)],
);
