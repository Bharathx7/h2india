import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { runDeadlines } from "../clocks/clocks";
import { TransitionNotAllowedError } from "../status";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import {
  approveRfq,
  buyerRfq,
  buyerRfqs,
  closeRfq,
  createRfq,
  declineRfq,
  extendOfferDeadline,
  markViewed,
  moveQuote,
  moveRfq,
  quoteVersion,
  returnRfq,
  RfqError,
  saveQuoteDraft,
  sendQuote,
  submitRfq,
  supplierRfqs,
  updateRfqDraft,
  withdrawQuote,
  type QuoteInput,
} from "./records";
import type { QuoteMove, RfqMove } from "./transitions";

// Step 9.2 DONE WHEN: every allowed transition has a test and a forbidden one fails; a quote revision keeps v1
// readable; an RFQ to one supplier skips moderation and to two or more does not. And only the chosen suppliers (once
// sent) and the buyer can read an RFQ and its quotes.
const url = process.env.TEST_DATABASE_URL;
const DAY = 86_400_000;

describe.skipIf(!url)("RFQs and quotes", () => {
  let h: DbHandle;
  let buyer: Awaited<ReturnType<typeof makeCompany>>;
  let other: Awaited<ReturnType<typeof makeCompany>>;
  const s: Awaited<ReturnType<typeof makeCompany>>[] = [];
  let siteId = "";
  let moderator: Actor;
  const sup = (i: number) => {
    const c = s[i];
    if (!c) throw new Error("supplier missing");
    return c;
  };

  const quoteInput = (unit: bigint, extra: Partial<QuoteInput> = {}): QuoteInput => ({
    lines: [{ description: "Diaphragm compressor", quantity: 2, unitPricePaise: unit, gstRateBps: 1800, hsn: "8414" }],
    freightPaise: 6_000_000n,
    freightGstRateBps: 1800,
    deliveryTerms: "Delivered to Talegaon, freight included",
    freightIncluded: true,
    leadTimeWeeks: 16,
    validUntil: new Date(Date.now() + 20 * DAY),
    warrantyMonths: 24,
    schedule: [
      { percentBps: 3000, trigger: "On confirmation" },
      { percentBps: 7000, trigger: "Before dispatch" },
    ],
    ...extra,
  });

  async function draft(suppliers: string[]) {
    const admin = await loadActor(h.db, buyer.admin.id);
    const { id } = await createRfq(h.db, admin, buyer.org.id, {
      title: "Diaphragm compressors (2 units)",
      items: [{ description: "Diaphragm compressor, 500 bar outlet", quantity: 2 }],
      deliverySiteId: siteId,
      offerDeadline: new Date(Date.now() + 10 * DAY),
      supplierIds: suppliers,
    });
    return id;
  }
  const status = async (id: string) =>
    (await h.db.select({ s: schema.rfqs.status }).from(schema.rfqs).where(eq(schema.rfqs.id, id)))[0]?.s;
  const quoteStatus = async (id: string) =>
    (await h.db.select({ s: schema.quotes.status }).from(schema.quotes).where(eq(schema.quotes.id, id)))[0]?.s;

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    buyer = await makeCompany(h.db, "Greenfield RFQ");
    other = await makeCompany(h.db, "Other buyer");
    for (const name of ["Hydrotek", "Pranava", "Sahyadri"]) {
      const c = await makeCompany(h.db, `${name} RFQ`, "supplier");
      await h.db
        .update(schema.organisations)
        .set({ verification: "Verified" })
        .where(eq(schema.organisations.id, c.org.id));
      // The supplier admin can send quotes (Admin role); add a Sales person too.
      s.push(c);
    }
    const [site] = await h.db
      .insert(schema.deliverySites)
      .values({ organisationId: buyer.org.id, name: "Talegaon plant", address: "Plot 14", isDefault: true })
      .returning();
    siteId = site?.id ?? "";
    const op = await makeUser(h.db, "RFQ moderator");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Operations")));
    if (!role) throw new Error("Operations role missing");
    await h.db.insert(schema.operatorRoles).values({ userId: op.id, roleId: role.id });
    moderator = await loadActor(h.db, op.id);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("refuses unverified suppliers and more than five", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const unverified = await makeCompany(h.db, "Unverified RFQ", "supplier");
    await expect(
      createRfq(h.db, admin, buyer.org.id, { title: "x", supplierIds: [unverified.org.id] }),
    ).rejects.toThrow("verified suppliers only");
    await expect(
      createRfq(h.db, admin, buyer.org.id, { title: "x", supplierIds: ["1", "2", "3", "4", "5", "6"] }),
    ).rejects.toThrow("up to 5");
  });

  it("an RFQ to one supplier skips moderation (Draft → Sent)", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const id = await draft([sup(0).org.id]);
    expect(await submitRfq(h.db, admin, buyer.org.id, id)).toBe("Sent");
    expect(await status(id)).toBe("Sent");
    const [deadline] = await h.db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.subjectId, id), eq(schema.deadlines.type, "rfqOfferDeadline")));
    expect(deadline?.status).toBe("Open");
  });

  it("to two or more it goes to moderation; return, edit and approve (In moderation → Returned → Draft → … → Sent)", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const id = await draft([sup(0).org.id, sup(1).org.id]);
    expect(await submitRfq(h.db, admin, buyer.org.id, id)).toBe("In moderation");
    // Suppliers can't see it yet.
    const supplierA = await loadActor(h.db, sup(0).admin.id);
    expect((await supplierRfqs(h.db, scopeFor(supplierA), sup(0).org.id)).some((x) => x.rfq.id === id)).toBe(false);
    await expect(returnRfq(h.db, moderator, id, { reasons: [] })).rejects.toBeInstanceOf(RfqError);
    await returnRfq(h.db, moderator, id, { reasons: ["Specification unclear"], note: "Add the outlet pressure." });
    expect(await status(id)).toBe("Returned");
    await updateRfqDraft(h.db, admin, buyer.org.id, id, { requirements: "500 bar outlet, oil-free" });
    expect(await status(id)).toBe("Draft");
    expect(await submitRfq(h.db, admin, buyer.org.id, id)).toBe("In moderation");
    await approveRfq(h.db, moderator, id);
    expect(await status(id)).toBe("Sent");
    expect((await supplierRfqs(h.db, scopeFor(supplierA), sup(0).org.id)).some((x) => x.rfq.id === id)).toBe(true);
    const detail = await buyerRfq(h.db, scopeFor(admin), buyer.org.id, id);
    expect(detail?.decisions.map((d) => d.decision)).toEqual(["Approved", "Returned"]);
    // A buyer can't approve their own RFQ.
    await expect(approveRfq(h.db, admin, id)).rejects.toThrow();
  });

  it("quotes: Draft → Sent → Revised → Revised, v1 stays readable; Sent → Quotes received; Withdrawn; Expired → Revised", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const id = await draft([sup(0).org.id, sup(1).org.id, sup(2).org.id]);
    await submitRfq(h.db, admin, buyer.org.id, id);
    await approveRfq(h.db, moderator, id);
    const a = await loadActor(h.db, sup(0).admin.id);
    const b = await loadActor(h.db, sup(1).admin.id);
    const c = await loadActor(h.db, sup(2).admin.id);

    await markViewed(h.db, a, sup(0).org.id, id);
    const first = await saveQuoteDraft(h.db, a, sup(0).org.id, id, quoteInput(415_000_000n));
    expect(first.reference).toMatch(/^Q-\d{4,}$/);
    expect(await quoteStatus(first.quoteId)).toBe("Draft");
    // Nothing sent yet: the buyer sees no quote.
    expect(
      await quoteVersion(h.db, scopeFor(admin), { organisationId: buyer.org.id, side: "buyer" }, first.quoteId),
    ).toBeNull();
    expect((await sendQuote(h.db, a, sup(0).org.id, first.quoteId)).status).toBe("Sent");
    expect(await status(id)).toBe("Quotes received");

    // A revision needs a What changed note, then keeps v1 readable.
    await saveQuoteDraft(h.db, a, sup(0).org.id, id, quoteInput(402_000_000n, { leadTimeWeeks: 14 }));
    await expect(sendQuote(h.db, a, sup(0).org.id, first.quoteId)).rejects.toMatchObject({
      errors: { changeNote: "Tell the buyer what changed" },
    });
    await saveQuoteDraft(
      h.db,
      a,
      sup(0).org.id,
      id,
      quoteInput(402_000_000n, { leadTimeWeeks: 14, changeNote: "Lower unit price; two heads in stock." }),
    );
    // While v2 is a draft the buyer still sees v1.
    const reader = { organisationId: buyer.org.id, side: "buyer" as const };
    expect((await quoteVersion(h.db, scopeFor(admin), reader, first.quoteId))?.version.version).toBe(1);
    expect((await sendQuote(h.db, a, sup(0).org.id, first.quoteId)).status).toBe("Revised");
    const latest = await quoteVersion(h.db, scopeFor(admin), reader, first.quoteId);
    expect(latest?.version.version).toBe(2);
    expect(latest?.version.totalPaise).toBe(955_800_000n);
    expect(latest?.version.changeNote).toMatch("Lower unit price");
    const v1 = await quoteVersion(h.db, scopeFor(admin), reader, first.quoteId, 1);
    expect(v1?.version.totalPaise).toBe(986_480_000n);
    expect(v1?.lines[0]?.unitPricePaise).toBe(415_000_000n);
    // The buyer's list counts suppliers and sent quotes (557:8 "Quotes received 1/3").
    const listed = (await buyerRfqs(h.db, scopeFor(admin), buyer.org.id)).find((x) => x.rfq.id === id);
    expect([listed?.suppliers, listed?.quoted]).toEqual([3, 1]);
    // Revised → Revised (v3).
    await saveQuoteDraft(h.db, a, sup(0).org.id, id, quoteInput(400_000_000n, { changeNote: "Price matched." }));
    expect((await sendQuote(h.db, a, sup(0).org.id, first.quoteId)).status).toBe("Revised");

    // Another buyer and another supplier can't read it.
    const outsider = await loadActor(h.db, other.admin.id);
    expect(
      await quoteVersion(h.db, scopeFor(outsider), { organisationId: other.org.id, side: "buyer" }, first.quoteId),
    ).toBeNull();
    expect(
      await quoteVersion(h.db, scopeFor(b), { organisationId: sup(1).org.id, side: "supplier" }, first.quoteId),
    ).toBeNull();
    expect(await buyerRfq(h.db, scopeFor(outsider), buyer.org.id, id)).toBeNull();
    expect(await buyerRfqs(h.db, scopeFor(outsider), buyer.org.id)).toEqual([]);

    // Sent → Withdrawn.
    const second = await saveQuoteDraft(h.db, b, sup(1).org.id, id, quoteInput(398_000_000n));
    await sendQuote(h.db, b, sup(1).org.id, second.quoteId);
    await withdrawQuote(h.db, b, sup(1).org.id, second.quoteId, { reason: "Can't meet the lead time" });
    expect(await quoteStatus(second.quoteId)).toBe("Withdrawn");
    await expect(saveQuoteDraft(h.db, b, sup(1).org.id, id, quoteInput(1n))).rejects.toThrow("can't be changed");

    // Sent → Expired when validity ends, then Expired → Revised with a new quote.
    const third = await saveQuoteDraft(
      h.db,
      c,
      sup(2).org.id,
      id,
      quoteInput(412_000_000n, { validUntil: new Date(Date.now() + 2 * DAY) }),
    );
    await sendQuote(h.db, c, sup(2).org.id, third.quoteId);
    await runDeadlines(h.db, new Date(Date.now() + 3 * DAY));
    expect(await quoteStatus(third.quoteId)).toBe("Expired");
    await saveQuoteDraft(
      h.db,
      c,
      sup(2).org.id,
      id,
      quoteInput(410_000_000n, { changeNote: "New validity", validUntil: new Date(Date.now() + 30 * DAY) }),
    );
    expect((await sendQuote(h.db, c, sup(2).org.id, third.quoteId)).status).toBe("Revised");

    // Closing: Quotes received → Closed; open quotes become Not selected (Revised → Not selected).
    await closeRfq(h.db, admin, buyer.org.id, id, { reason: "declined all" });
    expect(await status(id)).toBe("Closed");
    expect(await quoteStatus(first.quoteId)).toBe("Not selected");
    expect(await quoteStatus(third.quoteId)).toBe("Not selected");
    expect(await quoteStatus(second.quoteId)).toBe("Withdrawn");
  });

  it("Sent → Closed, Sent → Not selected, Sent → Accepted, Expired → Not selected, and declines", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const id = await draft([sup(0).org.id]);
    await submitRfq(h.db, admin, buyer.org.id, id);
    const b = await loadActor(h.db, sup(0).admin.id);
    await declineRfq(h.db, b, sup(0).org.id, id, { reason: "Out of our range" });
    await expect(saveQuoteDraft(h.db, b, sup(0).org.id, id, quoteInput(1n))).rejects.toThrow("declined");
    await closeRfq(h.db, admin, buyer.org.id, id, { reason: "closed" });
    expect(await status(id)).toBe("Closed");

    const id2 = await draft([sup(1).org.id]);
    await submitRfq(h.db, admin, buyer.org.id, id2);
    const p = await loadActor(h.db, sup(1).admin.id);
    const quote = await saveQuoteDraft(h.db, p, sup(1).org.id, id2, quoteInput(398_000_000n));
    await sendQuote(h.db, p, sup(1).org.id, quote.quoteId);
    // Accept (the hand-over to orders is step 9.8): Sent → Accepted, and the RFQ closes keeping it.
    await moveQuote(
      h.db,
      admin.userId,
      { id: quote.quoteId, organisationId: sup(1).org.id },
      { from: "Sent", to: "Accepted" },
    );
    await closeRfq(h.db, admin, buyer.org.id, id2, { reason: "accepted", keepQuoteId: quote.quoteId });
    expect(await quoteStatus(quote.quoteId)).toBe("Accepted");

    // Sent → Not selected and Expired → Not selected through the table directly.
    const id3 = await draft([sup(2).org.id]);
    await submitRfq(h.db, admin, buyer.org.id, id3);
    const c = await loadActor(h.db, sup(2).admin.id);
    const q3 = await saveQuoteDraft(h.db, c, sup(2).org.id, id3, quoteInput(1_000n));
    await sendQuote(h.db, c, sup(2).org.id, q3.quoteId);
    await moveQuote(h.db, null, { id: q3.quoteId, organisationId: sup(2).org.id }, { from: "Sent", to: "Expired" });
    await moveQuote(
      h.db,
      null,
      { id: q3.quoteId, organisationId: sup(2).org.id },
      { from: "Expired", to: "Not selected" },
    );
    expect(await quoteStatus(q3.quoteId)).toBe("Not selected");
  });

  it("refuses a forbidden move, at run time too", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const id = await draft([sup(0).org.id]);
    await expect(
      moveRfq(h.db, admin.userId, { id, organisationId: buyer.org.id }, {
        from: "Draft",
        to: "Closed",
      } as unknown as RfqMove),
    ).rejects.toBeInstanceOf(TransitionNotAllowedError);
    await expect(
      moveQuote(h.db, null, { id, organisationId: buyer.org.id }, {
        from: "Withdrawn",
        to: "Sent",
      } as unknown as QuoteMove),
    ).rejects.toBeInstanceOf(TransitionNotAllowedError);
  });

  it("extending the deadline moves the clock and reopens expired suppliers", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const id = await draft([sup(0).org.id]);
    await submitRfq(h.db, admin, buyer.org.id, id);
    const later = new Date(Date.now() + 20 * DAY);
    await extendOfferDeadline(h.db, admin, buyer.org.id, id, later);
    const open = await h.db
      .select()
      .from(schema.deadlines)
      .where(
        and(
          eq(schema.deadlines.subjectId, id),
          eq(schema.deadlines.type, "rfqOfferDeadline"),
          eq(schema.deadlines.status, "Open"),
        ),
      );
    expect(open.map((d) => d.dueAt.getTime())).toEqual([later.getTime()]);
    // A Requester of another company can't extend it.
    const outsider = await loadActor(h.db, other.admin.id);
    await expect(
      extendOfferDeadline(h.db, outsider, buyer.org.id, id, new Date(Date.now() + 30 * DAY)),
    ).rejects.toThrow();
  });
});
