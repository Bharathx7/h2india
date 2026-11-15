import { randomBytes } from "node:crypto";
import { FlagOffError } from "@h2india/config";
import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { simBankTransfer, simCompleteCheckout } from "../adapters/payments";
import { signSimWebhook } from "../adapters/payments/sim";
import { loadActor, type Actor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { monthlyIdentity, orderLedgerProblems } from "../ledger";
import { recordPasskeyStepUp } from "../sign-in/step-up";
import { TransitionNotAllowedError } from "../status";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { addToCart, OtherSupplierInCart, viewCart } from "./cart";
import { checkoutView, saveCheckout } from "./checkout";
import {
  acceptDelivery,
  approveOrder,
  cancelOrder,
  decideDispute,
  dispatchOrder,
  placeCartOrder,
  saveDispatchDetails,
  uploadProofOfDelivery,
  recordReceipt,
  replyToDispute,
  reportProblem,
  supplierAccept,
  supplierDecline,
} from "./flow";
import { deliverSimWebhooks, heldOn, receiveWebhook, reconcile, runPayouts, startOnlinePayment } from "./money";
import { insertOrder, moveOrder, orderDetail } from "./records";
import { buyerPayments, buyerRefunds, supplierMonths, supplierPayouts, supplierSettlements } from "./statements";
import { must } from "../must";

// Stage 10 DONE WHEN (against the simulated partner, A176): the full order money flow runs; the same webhook twice
// changes the ledger once; a settlement difference shows in reconciliation; ledger rows can't be changed; a requester
// can't approve their own order and approval needs a fresh passkey; bank-transfer instructions never show the
// supplier's bank; accepting part releases exactly that amount; company B can't read company A's order.
const url = process.env.TEST_DATABASE_URL;
const ON = { flags: { FLAG_TRANSACTIONS: "true" } };
const DAY = 86_400_000;

describe.skipIf(!url)("orders, payments and the ledger", () => {
  let h: DbHandle;
  let buyer: Awaited<ReturnType<typeof makeCompany>>;
  let supplier: Awaited<ReturnType<typeof makeCompany>>;
  let other: Awaited<ReturnType<typeof makeCompany>>;
  let operator: Actor;
  let productId = "";
  let siteId = "";
  let gstinId = "";
  const checkout = () => ({
    deliverySiteId: siteId,
    billingGstinId: gstinId,
    receiverName: "Site stores",
    receiverMobile: "9876543210",
    paymentMethod: "online" as const,
  });
  const status = async (id: string) =>
    (await h.db.select({ s: schema.orders.status }).from(schema.orders).where(eq(schema.orders.id, id)))[0]?.s;

  async function newProduct(supplierId: string, pricePaise: bigint) {
    const [cat] = await h.db.select({ id: schema.catalogueCategories.id }).from(schema.catalogueCategories).limit(1);
    const [p] = await h.db
      .insert(schema.products)
      .values({
        organisationId: supplierId,
        categoryId: must(cat).id,
        slug: `test-${randomBytes(4).toString("hex")}`,
        name: "Hydrogen leak detector",
        pricing: "fixed",
        pricePaise,
        priceCurrency: "INR",
        gstRateBps: 1800,
        status: "Live",
        stock: "in_stock",
        stockQty: 50,
      })
      .returning();
    return must(p).id;
  }

  async function doc(userId: string) {
    const [f] = await h.db
      .insert(schema.files)
      .values({
        kind: "order_document",
        status: "Available",
        uploadedBy: userId,
        organisationId: supplier.org.id,
        name: "doc.pdf",
        declaredType: "application/pdf",
        declaredBytes: 1000,
        quarantineKey: `q/${String(Math.random())}`,
        bucket: "private",
        objectKey: `o/${String(Math.random())}`,
      })
      .returning();
    return must(f).id;
  }

  /** The 693:814 checklist, Mark as shipped, then proof of delivery (which issues the delivery code). */
  async function ship(orderId: string, sAdmin: Actor, invoice: string) {
    await saveDispatchDetails(
      h.db,
      sAdmin,
      supplier.org.id,
      orderId,
      {
        invoiceNumber: invoice,
        invoiceFileId: await doc(supplier.admin.id),
        irn: "IRN-TEST",
        certificatesNote: "Factory test report uploaded",
        transporter: "Gati KWE",
        lrNumber: "4410 1967",
        expectedAt: new Date(Date.now() + 3 * DAY),
      },
      undefined,
      ON,
    );
    await dispatchOrder(h.db, sAdmin, supplier.org.id, orderId, undefined, ON);
    return uploadProofOfDelivery(
      h.db,
      sAdmin,
      supplier.org.id,
      orderId,
      { fileIds: [await doc(supplier.admin.id)], deliveredOn: new Date(), receivedBy: "Site stores" },
      undefined,
      ON,
    );
  }

  async function placeOne(actor: Actor, qty = 2) {
    await addToCart(h.db, actor, buyer.org.id, { productId, quantity: qty }, ON);
    return placeCartOrder(h.db, actor, buyer.org.id, checkout(), undefined, ON);
  }

  async function payAll(orderId: string, buyerActor: Actor) {
    const detail = await orderDetail(scopeFor(buyerActor), h.db, orderId);
    for (const m of must(detail).milestones.filter((x) => x.status === "Due")) {
      const c = await startOnlinePayment(h.db, buyerActor, buyer.org.id, { orderId, milestoneId: m.id, method: "upi" });
      const ev = await simCompleteCheckout(h.db, c.paymentId, "succeed");
      const raw = JSON.stringify(ev);
      expect(await receiveWebhook(h.db, raw, signSimWebhook(raw))).toBe("processed");
    }
  }

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    buyer = await makeCompany(h.db, "Greenfield Orders");
    other = await makeCompany(h.db, "Other Orders");
    supplier = await makeCompany(h.db, "Hydrotek Orders", "supplier");
    productId = await newProduct(supplier.org.id, 12_500_00n);
    const [site] = await h.db
      .insert(schema.deliverySites)
      .values({ organisationId: buyer.org.id, name: "Talegaon plant", address: "Plot 14", isDefault: true })
      .returning();
    siteId = must(site).id;
    const [g] = await h.db
      .insert(schema.organisationGstins)
      .values({
        organisationId: buyer.org.id,
        gstin: `27${randomBytes(6).toString("hex").toUpperCase().slice(0, 13)}`,
        stateCode: "27",
        portalStatus: "Active",
        isDefault: true,
      })
      .returning();
    gstinId = must(g).id;
    await h.db.insert(schema.payoutBankAccounts).values({
      organisationId: supplier.org.id,
      holderName: "Hydrotek Orders Test Company",
      accountLast4: "4321",
      accountCipher: "test-only",
      ifsc: "SIMB0000002",
      status: "Active",
    });
    const op = await makeUser(h.db, "Orders operator");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Operations")));
    await h.db.insert(schema.operatorRoles).values({ userId: op.id, roleId: must(role).id });
    operator = await loadActor(h.db, op.id);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("everything is refused with transactions off", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    await expect(
      addToCart(h.db, admin, buyer.org.id, { productId, quantity: 1 }, { flags: {} }),
    ).rejects.toBeInstanceOf(FlagOffError);
    await expect(
      placeCartOrder(h.db, admin, buyer.org.id, checkout(), undefined, { flags: {} }),
    ).rejects.toBeInstanceOf(FlagOffError);
  });

  it("with a pilot list, only listed companies can order (10.12)", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    await h.db
      .insert(schema.settings)
      .values({ key: "transactions.pilotOrganisations", value: [other.org.id] })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: [other.org.id] } });
    try {
      await expect(addToCart(h.db, admin, buyer.org.id, { productId, quantity: 1 }, ON)).rejects.toBeInstanceOf(
        FlagOffError,
      );
    } finally {
      await h.db.delete(schema.settings).where(eq(schema.settings.key, "transactions.pilotOrganisations"));
    }
  });

  it("a cart holds one supplier at a time and prices come from the product", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    await addToCart(h.db, admin, buyer.org.id, { productId, quantity: 2 }, ON);
    const second = await makeCompany(h.db, "Second supplier", "supplier");
    const otherProduct = await newProduct(second.org.id, 100_00n);
    await expect(
      addToCart(h.db, admin, buyer.org.id, { productId: otherProduct, quantity: 1 }, ON),
    ).rejects.toBeInstanceOf(OtherSupplierInCart);
    const cart = await viewCart(h.db, admin, buyer.org.id);
    expect(cart.items).toHaveLength(1);
    // ₹12,500 × 2 = ₹25,000 + 18% GST = ₹29,500
    expect(cart.totalPaise).toBe(29_500_00n);
    await addToCart(h.db, admin, buyer.org.id, { productId: otherProduct, quantity: 1, replace: true }, ON);
    expect((await viewCart(h.db, admin, buyer.org.id)).supplier?.id).toBe(second.org.id);
    await addToCart(h.db, admin, buyer.org.id, { productId, quantity: 2, replace: true }, ON);
  });

  it("keeps checkout choices between steps and refuses another company's site or an unverified GSTIN", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    await addToCart(h.db, admin, buyer.org.id, { productId, quantity: 2, replace: true }, ON);
    const [foreign] = await h.db
      .insert(schema.deliverySites)
      .values({ organisationId: other.org.id, name: "Not yours", address: "Elsewhere" })
      .returning();
    await expect(saveCheckout(h.db, admin, buyer.org.id, { deliverySiteId: must(foreign).id })).rejects.toThrow(
      "Check the highlighted fields",
    );
    await saveCheckout(h.db, admin, buyer.org.id, {
      deliverySiteId: siteId,
      receiverName: "Site stores",
      receiverMobile: "9876543210",
      billingGstinId: gstinId,
      paymentMethod: "bank_transfer",
      poNumber: "PO-1",
    });
    const v = await checkoutView(h.db, admin, buyer.org.id);
    expect(v.choices).toMatchObject({ deliverySiteId: siteId, billingGstinId: gstinId, poNumber: "PO-1" });
    expect(v.cart.totalPaise).toBe(29_500_00n);
  });

  it("routes to approval above the limit; no self-approval; approval needs a fresh passkey", async () => {
    // The requester becomes the company's Approver (575:696) and the approval rule names them.
    await h.db
      .update(schema.memberships)
      .set({ role: "Approver" })
      .where(
        and(eq(schema.memberships.organisationId, buyer.org.id), eq(schema.memberships.userId, buyer.requester.id)),
      );
    await h.db
      .insert(schema.buyerSettings)
      .values({ organisationId: buyer.org.id, approvalAbovePaise: 10_000_00n, approverId: buyer.requester.id })
      .onConflictDoUpdate({
        target: schema.buyerSettings.organisationId,
        set: { approvalAbovePaise: 10_000_00n, approverId: buyer.requester.id },
      });
    const admin = await loadActor(h.db, buyer.admin.id);
    const approver = await loadActor(h.db, buyer.requester.id);
    try {
      // The approver places an order above the limit: they can't approve it themselves, even with a passkey.
      const own = await placeOne(approver);
      expect(own.status).toBe("Awaiting approval");
      await recordPasskeyStepUp(h.db, buyer.requester.id);
      await expect(approveOrder(h.db, approver, buyer.org.id, own.id, {}, undefined, ON)).rejects.toThrow(
        "can't approve your own order",
      );
      await cancelOrder(h.db, approver, buyer.org.id, own.id, "Placed by mistake", undefined, ON);
      expect(await status(own.id)).toBe("Cancelled");

      // The admin places one: the approver approves it, only after a fresh passkey.
      const o2 = await placeOne(admin);
      expect(o2.status).toBe("Awaiting approval");
      await h.db
        .delete(schema.signInThrottle)
        .where(eq(schema.signInThrottle.key, `step-up:passkey:${buyer.requester.id}`));
      await expect(approveOrder(h.db, approver, buyer.org.id, o2.id, {}, undefined, ON)).rejects.toThrow("step_up");
      await recordPasskeyStepUp(h.db, buyer.requester.id);
      const approved = await approveOrder(h.db, approver, buyer.org.id, o2.id, {}, undefined, ON);
      expect(approved.status).toBe("Pending acceptance");
      await cancelOrder(h.db, admin, buyer.org.id, o2.id, "Test done", undefined, ON);
    } finally {
      await h.db
        .update(schema.buyerSettings)
        .set({ approvalAbovePaise: null })
        .where(eq(schema.buyerSettings.organisationId, buyer.org.id));
    }
  });

  it("runs the whole money flow once, and a duplicate webhook changes nothing", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const sAdmin = await loadActor(h.db, supplier.admin.id);
    const order = await placeOne(admin);
    expect(order.status).toBe("Pending acceptance");
    expect(order.totalPaise).toBe(29_500_00n);

    // Company B sees nothing; the supplier sees it.
    const outsider = await loadActor(h.db, other.admin.id);
    expect(await orderDetail(scopeFor(outsider), h.db, order.id)).toBeNull();
    expect((await orderDetail(scopeFor(sAdmin), h.db, order.id))?.side).toBe("supplier");

    await expect(
      supplierDecline(h.db, sAdmin, supplier.org.id, order.id, { reason: " " }, undefined, ON),
    ).rejects.toThrow("Give a reason");
    const accepted = await supplierAccept(
      h.db,
      sAdmin,
      supplier.org.id,
      order.id,
      { dispatchBy: new Date(Date.now() + 7 * DAY) },
      undefined,
      ON,
    );
    expect(accepted.status).toBe("Awaiting payment");

    // The order's own account, never the supplier's bank.
    const d = await orderDetail(scopeFor(admin), h.db, order.id);
    expect(d?.account?.ifsc).toBe("SIMB0000001");
    expect(d?.account?.accountNumber).not.toContain("4321");

    // Pay online; the success webhook arrives twice.
    const m = must(must(d).milestones[0]);
    const c = await startOnlinePayment(h.db, admin, buyer.org.id, {
      orderId: order.id,
      milestoneId: m.id,
      method: "upi",
    });
    expect(c.checkoutUrl).toContain("/dev/pay/");
    const ev = await simCompleteCheckout(h.db, c.paymentId, "succeed");
    const raw = JSON.stringify(ev);
    expect(await receiveWebhook(h.db, raw, signSimWebhook(raw))).toBe("processed");
    expect(await receiveWebhook(h.db, raw, signSimWebhook(raw))).toBe("duplicate");
    await expect(receiveWebhook(h.db, raw, "00")).rejects.toThrow("Bad signature");
    expect(await heldOn(h.db, order.id)).toBe(29_500_00n);
    expect(await status(order.id)).toBe("Ready to dispatch");

    // Dispatch, then the receiving contact records the delivery with the code.
    // Mark as shipped stays locked until the checklist is done.
    await expect(dispatchOrder(h.db, sAdmin, supplier.org.id, order.id, undefined, ON)).rejects.toThrow("items left");
    const sent = await ship(order.id, sAdmin, "INV-1");
    const wrong = sent.code === "000000" ? "111111" : "000000";
    expect((await recordReceipt(h.db, { token: sent.token, code: wrong, condition: "Good" })).ok).toBe(false);
    expect(await status(order.id)).toBe("Delivered");
    expect((await recordReceipt(h.db, { token: sent.token, code: sent.code, condition: "Good" })).ok).toBe(true);
    // Single use: the same code can't be used twice.
    expect((await recordReceipt(h.db, { token: sent.token, code: sent.code, condition: "Good" })).ok).toBe(false);

    // Accept: everything held is released, minus the fee and deductions, and paid out at the next run.
    await acceptDelivery(h.db, admin, buyer.org.id, order.id, undefined, ON);
    expect(await status(order.id)).toBe("Accepted by buyer");
    expect(await heldOn(h.db, order.id)).toBe(0n);
    const [settlement] = await h.db
      .select()
      .from(schema.orderSettlements)
      .where(eq(schema.orderSettlements.orderId, order.id));
    expect(settlement?.netPaise).toBe(
      29_500_00n -
        must(settlement).feePaise -
        must(settlement).gstOnFeePaise -
        must(settlement).tcsPaise -
        must(settlement).tdsPaise,
    );
    const later = new Date(Date.now() + 10 * DAY);
    expect((await runPayouts(h.db, later)).length).toBeGreaterThanOrEqual(1);
    await deliverSimWebhooks(h.db, new Date(Date.now() + 60_000));
    expect(await status(order.id)).toBe("Closed");

    // The books agree.
    const from = new Date(Date.now() - DAY);
    const id = await monthlyIdentity(h.db, from, new Date(Date.now() + DAY));
    expect(id.difference).toBe(0n);
    expect((await orderLedgerProblems(h.db)).filter((p) => p.orderId === order.id)).toEqual([]);
  });

  it("bank transfers count only when the partner reports them; partial payments stay due", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const sAdmin = await loadActor(h.db, supplier.admin.id);
    const order = await placeOne(admin, 1);
    await supplierAccept(
      h.db,
      sAdmin,
      supplier.org.id,
      order.id,
      { dispatchBy: new Date(Date.now() + 7 * DAY) },
      undefined,
      ON,
    );
    const ev = await simBankTransfer(h.db, order.reference, 5_000_00n);
    const raw = JSON.stringify(ev);
    await receiveWebhook(h.db, raw, signSimWebhook(raw));
    const d = await orderDetail(scopeFor(admin), h.db, order.id);
    expect(d?.status).toBe("Awaiting payment");
    expect(d?.milestones[0]?.status).toBe("Partly paid");
    expect(d?.milestones[0]?.paidPaise).toBe(5_000_00n);
  });

  it("accepting part releases exactly that; the operator's split refunds the rest", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const sAdmin = await loadActor(h.db, supplier.admin.id);
    const order = await placeOne(admin);
    await supplierAccept(
      h.db,
      sAdmin,
      supplier.org.id,
      order.id,
      { dispatchBy: new Date(Date.now() + 7 * DAY) },
      undefined,
      ON,
    );
    await payAll(order.id, admin);
    const sent = await ship(order.id, sAdmin, "INV-2");
    await recordReceipt(h.db, { token: sent.token, code: sent.code, condition: "Damaged", notes: "One unit cracked" });
    const dispute = await reportProblem(
      h.db,
      admin,
      buyer.org.id,
      order.id,
      { reason: "Damaged in transit", details: "One of two units cracked", acceptedPaise: 14_750_00n },
      undefined,
      ON,
    );
    expect(dispute.disputedPaise).toBe(14_750_00n);
    expect(await heldOn(h.db, order.id)).toBe(14_750_00n);
    expect(await status(order.id)).toBe("Disputed");
    await expect(
      replyToDispute(h.db, sAdmin, supplier.org.id, dispute.id, {
        offer: "partial_refund",
        reply: "x",
        refundPaise: 0n,
      }),
    ).rejects.toThrow("Check your response");
    await replyToDispute(h.db, sAdmin, supplier.org.id, dispute.id, { offer: "disagree", reply: "It left us sealed" });
    await decideDispute(h.db, operator, dispute.id, { outcome: "refund_buyer", note: "Damage confirmed by photos" });
    expect(await status(order.id)).toBe("Accepted by buyer");
    const [r] = await h.db.select().from(schema.refunds).where(eq(schema.refunds.orderId, order.id));
    expect(r?.status).toBe("Processing");
    await deliverSimWebhooks(h.db, new Date(Date.now() + 60_000));
    const [r2] = await h.db
      .select()
      .from(schema.refunds)
      .where(eq(schema.refunds.id, must(r).id));
    expect(r2?.status).toBe("Refunded");
    expect(await heldOn(h.db, order.id)).toBe(0n);
  });

  it("a 30/70 order pays out the advance once paid and holds the balance until acceptance (A177)", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const sAdmin = await loadActor(h.db, supplier.admin.id);
    const order = await h.db.transaction((tx) =>
      insertOrder(tx, {
        buyerOrganisationId: buyer.org.id,
        supplierOrganisationId: supplier.org.id,
        placedBy: buyer.admin.id,
        source: "quote",
        paymentMethod: "bank_transfer",
        receiverName: "Site stores",
        receiverMobile: "9876543210",
        lines: [{ description: "Compressor skid", quantity: 1, unitPricePaise: 1_00_000_00n, gstRateBps: 1800 }],
        schedule: [
          { percentBps: 3000, trigger: "On confirmation" },
          { percentBps: 7000, trigger: "Before dispatch" },
        ],
        needsApproval: false,
      }),
    );
    expect(
      (
        await supplierAccept(
          h.db,
          sAdmin,
          supplier.org.id,
          order.id,
          { dispatchBy: new Date(Date.now() + 7 * DAY) },
          undefined,
          ON,
        )
      ).status,
    ).toBe("Awaiting payment");
    await payAll(order.id, admin);
    // ₹1,18,000 total: the 30% advance (₹35,400) goes to the supplier; nothing is held yet.
    const settled = await h.db
      .select()
      .from(schema.orderSettlements)
      .where(eq(schema.orderSettlements.orderId, order.id));
    expect(settled.map((x) => x.releasedPaise)).toEqual([35_400_00n]);
    expect(await status(order.id)).toBe("Ready to dispatch");
    await payAll(order.id, admin);
    expect(await heldOn(h.db, order.id)).toBe(82_600_00n);
  });

  it("payments, refunds, releases and payouts are readable only by their own company", async () => {
    const outsider = scopeFor(await loadActor(h.db, other.admin.id));
    expect(await buyerPayments(outsider, h.db, buyer.org.id)).toEqual([]);
    expect(await buyerRefunds(outsider, h.db, buyer.org.id)).toEqual([]);
    expect(await supplierSettlements(outsider, h.db, supplier.org.id)).toEqual([]);
    expect(await supplierPayouts(outsider, h.db, supplier.org.id)).toEqual([]);
    const own = scopeFor(await loadActor(h.db, supplier.admin.id));
    expect((await supplierSettlements(own, h.db, supplier.org.id)).length).toBeGreaterThan(0);
    expect((await supplierMonths(own, h.db, supplier.org.id))[0]?.net).toBeGreaterThan(0n);
  });

  it("forbidden moves fail, and the ledger can't be edited", async () => {
    const admin = await loadActor(h.db, buyer.admin.id);
    const order = await placeOne(admin, 1);
    await expect(
      moveOrder(h.db, null, order, { from: "Pending acceptance", to: "Shipped" } as never),
    ).rejects.toBeInstanceOf(TransitionNotAllowedError);
    expect((await h.db.select().from(schema.ledgerLines).limit(1)).length).toBe(1);
    await expect(h.db.update(schema.ledgerLines).set({ debitPaise: 1n })).rejects.toThrow();
    await expect(h.db.delete(schema.ledgerTransactions)).rejects.toThrow();
  });

  it("reconciliation flags a payment the partner settled that we never confirmed", async () => {
    await simBankTransfer(h.db, "ORD-UNKNOWN", 1_00n); // settled at the partner, webhook never delivered
    const day = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
    await h.db
      .update(schema.simPartnerEvents)
      .set({ deliveredAt: new Date() })
      .where(eq(schema.simPartnerEvents.orderRef, "ORD-UNKNOWN"));
    const result = await reconcile(h.db, day);
    expect(result.issues).toBeGreaterThan(0);
    const issues = await h.db
      .select()
      .from(schema.reconciliationIssues)
      .where(eq(schema.reconciliationIssues.kind, "missing_payment"));
    expect(issues.length).toBeGreaterThan(0);
  });
});
