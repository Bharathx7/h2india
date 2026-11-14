import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { createRfq, submitRfq } from "../rfq/records";
import { listThreads, MessageError, postMessage, rfqThread, threadMessages, unreadMessages } from "./index";

// Step 9.7 DONE WHEN: a message from a supplier appears for the buyer (polling reads it without a reload); another
// company can't open the thread by guessing its address. (Attachments are only downloadable once the file check
// passed: fileLink refuses anything that isn't Available, tested in files.int.test.ts.)
const url = process.env.TEST_DATABASE_URL;
const DAY = 86_400_000;

describe.skipIf(!url)("messages", () => {
  let h: DbHandle;
  let buyer: Awaited<ReturnType<typeof makeCompany>>;
  let supplier: Awaited<ReturnType<typeof makeCompany>>;
  let other: Awaited<ReturnType<typeof makeCompany>>;
  let rfqId = "";
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    buyer = await makeCompany(h.db, "Messages buyer");
    supplier = await makeCompany(h.db, "Messages supplier", "supplier");
    other = await makeCompany(h.db, "Messages outsider", "supplier");
    await h.db
      .update(schema.organisations)
      .set({ verification: "Verified" })
      .where(eq(schema.organisations.id, supplier.org.id));
    const [site] = await h.db
      .insert(schema.deliverySites)
      .values({ organisationId: buyer.org.id, name: "Site", address: "Plot 1" })
      .returning();
    const admin = await loadActor(h.db, buyer.admin.id);
    const made = await createRfq(h.db, admin, buyer.org.id, {
      title: "Diaphragm compressors",
      items: [{ description: "Compressor", quantity: 2 }],
      deliverySiteId: site?.id ?? null,
      offerDeadline: new Date(Date.now() + 10 * DAY),
      supplierIds: [supplier.org.id],
    });
    rfqId = made.id;
    await submitRfq(h.db, admin, buyer.org.id, rfqId);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("a supplier's message reaches the buyer, with unread counts and a notice", async () => {
    const s = await loadActor(h.db, supplier.admin.id);
    const b = await loadActor(h.db, buyer.admin.id);
    const thread = await rfqThread(h.db, s, { rfqId, supplierId: supplier.org.id });
    // The buyer opening the same conversation gets the same thread.
    expect((await rfqThread(h.db, b, { rfqId, supplierId: supplier.org.id })).id).toBe(thread.id);
    const before = new Date(Date.now() - 1000);
    await postMessage(h.db, s, { threadId: thread.id, body: "Will the two units run in parallel?" });
    const seen = await threadMessages(h.db, b, thread.id, before);
    expect(seen?.messages.map((m) => [m.body, m.mine])).toEqual([["Will the two units run in parallel?", false]]);
    expect(await unreadMessages(h.db, b, buyer.org.id, "buyer")).toBe(1);
    const list = await listThreads(h.db, b, { organisationId: buyer.org.id, side: "buyer" });
    expect(list[0]?.reference).toMatch(/^RFQ-/);
    const notes = await h.db
      .select()
      .from(schema.notifications)
      .where(and(eq(schema.notifications.event, "message.received"), eq(schema.notifications.userId, buyer.admin.id)));
    expect(notes.some((n) => n.href === `/buyer/messages?thread=${thread.id}`)).toBe(true);
  });

  it("another company can't open, read or write the thread", async () => {
    const s = await loadActor(h.db, supplier.admin.id);
    const thread = await rfqThread(h.db, s, { rfqId, supplierId: supplier.org.id });
    const outsider = await loadActor(h.db, other.admin.id);
    expect(await threadMessages(h.db, outsider, thread.id)).toBeNull();
    await expect(postMessage(h.db, outsider, { threadId: thread.id, body: "hi" })).rejects.toBeInstanceOf(MessageError);
    // Not a recipient of the RFQ, so it can't start a thread on it either.
    await expect(rfqThread(h.db, outsider, { rfqId, supplierId: other.org.id })).rejects.toBeInstanceOf(MessageError);
    expect(await listThreads(h.db, outsider, { organisationId: buyer.org.id, side: "buyer" })).toEqual([]);
    const stranger = await loadActor(h.db, (await makeUser(h.db, "Stranger")).id);
    expect(await threadMessages(h.db, stranger, thread.id)).toBeNull();
  });

  it("a thread opens only once the RFQ has gone to the supplier", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const draft = await createRfq(h.db, admin, buyer.org.id, { title: "Draft", supplierIds: [supplier.org.id] });
    const s = await loadActor(h.db, supplier.admin.id);
    await expect(rfqThread(h.db, s, { rfqId: draft.id, supplierId: supplier.org.id })).rejects.toBeInstanceOf(
      MessageError,
    );
  });
});
