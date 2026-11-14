import { sql } from "drizzle-orm";
import { index, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";
import { products } from "./products";
import { rfqs } from "./rfq";

/**
 * Message threads (step 9.7; 572:8, 573:467): one buyer company and one supplier about one RFQ (or, later, an order or
 * a product question). Both sides' people with messages.use can read and write; nobody else can. Messages are never
 * edited; attachments go through the files service.
 */
export const messageThreads = core.table(
  "message_threads",
  {
    id: id(),
    buyerOrganisationId: uuid("buyer_organisation_id")
      .notNull()
      .references(() => organisations.id),
    supplierOrganisationId: uuid("supplier_organisation_id")
      .notNull()
      .references(() => organisations.id),
    rfqId: uuid("rfq_id").references(() => rfqs.id),
    /** Orders arrive in Stage 10. */
    orderId: uuid("order_id"),
    productId: uuid("product_id").references(() => products.id),
    lastMessageAt: utc("last_message_at")
      .notNull()
      .default(sql`now()`),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("message_threads_rfq")
      .on(t.rfqId, t.supplierOrganisationId)
      .where(sql`${t.rfqId} is not null`),
    index("message_threads_buyer").on(t.buyerOrganisationId, t.lastMessageAt),
    index("message_threads_supplier").on(t.supplierOrganisationId, t.lastMessageAt),
  ],
);

export const messages = core.table(
  "messages",
  {
    id: id(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    authorOrganisationId: uuid("author_organisation_id")
      .notNull()
      .references(() => organisations.id),
    body: text("body").notNull(),
    attachments: uuid("attachments")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("messages_thread").on(t.threadId, t.createdAt)],
);

/** How far each person has read a thread, for unread counts. */
export const messageReads = core.table(
  "message_reads",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    readAt: utc("read_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.userId] })],
);
