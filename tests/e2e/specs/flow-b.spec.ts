import { expect, test } from "../fixtures";
import { ownIp, withDb } from "../helpers/sign-in";
import { signInExisting } from "../helpers/rfq";
import { as, PDF, setup, sms } from "../helpers/orders";

// Flow B (playbook step 10.12, page 18): a fixed-price order, confirm then pay, against the simulated payment partner
// (A176). Product page → Add to cart → checkout (delivery, billing, payment, review) → order placed → the supplier
// accepts with a dispatch date → the buyer pays online on the partner's test page → the dispatch checklist → Mark as
// shipped → proof of delivery → the receiving contact records the delivery with the SMS code → the buyer accepts →
// the payout. Needs the app with FLAG_TRANSACTIONS=true, the worker (file checks, the partner's webhooks) and Mailpit.
// Approver review with a passkey is proven in orders.int.test.ts.

test("flow B: fixed-price order, confirm then pay, delivered and paid out", async ({
  page,
  browser,
  context,
}, info) => {
  test.skip(info.project.name !== "desktop-1440", "Runs once; the screens are checked at 390 by the page specs");
  test.setTimeout(240_000);
  await ownIp(context, info);
  const d = await setup();

  // 1 Product page → Add to cart → cart.
  await signInExisting(page, d.buyerEmail, `/marketplace/products/${d.slug}`);
  await page.getByRole("link", { name: "Add to cart" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cart" })).toBeVisible();
  await expect(page.getByText("₹8,02,400", { exact: true })).toBeVisible(); // ₹6,80,000 + 18% IGST (Gujarat to Maharashtra)
  await expect(page.getByText("IGST 18%")).toBeVisible();
  await page.getByRole("button", { name: /Proceed to checkout/ }).click();

  // 2 Checkout: delivery, billing, payment, review. Nothing is charged.
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await page.getByLabel("Receiving contact").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continue to billing" }).click();
  await page.getByLabel("Purchase order number").fill(`PO-${d.tag}`);
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByText("Nothing is charged now")).toBeVisible();
  await page.getByRole("radio", { name: "Pay online" }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Order placed" })).toBeVisible();
  const reference = (await page.locator("main .type-spec").first().textContent()) ?? "";
  expect(reference).toMatch(/^ORD-\d{4}-\d+/);

  // 3 The supplier accepts with a dispatch date.
  const s = await as(browser, d.supplierEmail, "/supplier/orders");
  await s.getByRole("link", { name: reference }).first().click();
  await expect(s.getByRole("heading", { level: 1 })).toContainText(`New order ${reference}`);
  const date = new Date(Date.now() + 7 * 86_400_000 + 5.5 * 3_600_000).toISOString().slice(0, 10);
  await s.getByLabel(/Dispatch date/).fill(date);
  await s.getByRole("button", { name: "Accept order" }).click();
  await expect(s.getByText(/Waiting for .* payment/)).toBeVisible();

  // 4 The buyer pays online on the partner's test page; the payment arrives by webhook.
  await page.getByRole("link", { name: "View order" }).click();
  await page.getByRole("button", { name: /Pay .* online/ }).click();
  await expect(page.getByText("Test checkout")).toBeVisible();
  await page.getByRole("button", { name: "Payment succeeds" }).click();
  await expect(page.getByText("Payment received")).toBeVisible();
  // Bank transfer details are the order's own account, never the supplier's bank.
  await expect(page.getByText("4321")).toHaveCount(0);

  // 5 The dispatch checklist, then Mark as shipped.
  await s.reload();
  await expect(s.getByRole("heading", { name: "Dispatch checklist" })).toBeVisible();
  await expect(s.getByRole("button", { name: "Mark as shipped" })).toBeDisabled();
  await s.getByRole("button", { name: "Upload tax invoice" }).click();
  await s
    .locator('[role="dialog"] input[type=file]')
    .setInputFiles({ name: "invoice.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(s.locator('[role="dialog"]').getByRole("img", { name: "Uploaded" })).toBeVisible({ timeout: 60_000 });
  await s.getByLabel("Invoice number").fill(`INV/${d.tag}`);
  await s.getByRole("button", { name: "Save" }).click();
  const fill = async (action: string, fields: [string, string][]) => {
    await s.getByRole("button", { name: action }).click();
    for (const [label, value] of fields) await s.getByRole("dialog").getByLabel(label, { exact: true }).fill(value);
    await s.getByRole("button", { name: "Save" }).click();
    await expect(s.getByRole("button", { name: action })).toHaveCount(0);
  };
  await fill("Add IRN", [["IRN", `IRN${d.tag}`]]);
  await fill("Add e-way bill number", [["E-way bill number", `EWB${d.tag}`]]);
  await fill("Add certificates", [["What's included, or why none is needed", "Factory test report uploaded"]]);
  await fill("Add carrier details", [
    ["Carrier", "Gati KWE"],
    ["LR or tracking number", `LR${d.tag}`],
    ["Expected delivery", date],
  ]);
  await s.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(s.getByRole("heading", { name: "In transit" })).toBeVisible();
  await sms(page, d.mobile, /is on its way with Gati KWE/);

  // 6 Proof of delivery; the receiving contact gets the code and records what arrived.
  await s.getByRole("button", { name: "Upload proof of delivery" }).click();
  await s
    .locator('[role="dialog"] input[type=file]')
    .setInputFiles({ name: "pod.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(s.locator('[role="dialog"]').getByRole("img", { name: "Uploaded" })).toBeVisible({ timeout: 60_000 });
  await s.getByLabel("Received by").fill("Suresh Patil");
  await s.getByRole("button", { name: "Upload and notify buyer" }).click();
  const code = await sms(page, d.mobile, /\/d\/([\w-]+) and enter code (\d{6})/);
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`/d/${code[1] ?? ""}`);
  await expect(phone.getByRole("heading", { name: "Record what arrived" })).toBeVisible();
  await expect(phone.getByText("₹")).toHaveCount(0); // never prices
  await phone.getByRole("textbox", { name: "Digit 1 of 6" }).fill(code[2] ?? "");
  await phone.getByRole("button", { name: "Record delivery" }).click();
  await expect(phone.getByRole("heading", { name: "Receipt recorded" })).toBeVisible();

  // 7 The buyer accepts; the payout is booked and, after the run, paid.
  await page.reload();
  await page.getByRole("button", { name: "Accept delivery" }).click();
  await expect(page.getByText(/^Delivery accepted/).first()).toBeVisible();
  await withDb(async (db) => {
    const r = await db.query<{ status: string }>("SELECT status FROM core.orders WHERE reference = $1", [reference]);
    expect(r.rows[0]?.status).toBe("Accepted by buyer");
    const settled = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM core.order_settlements s JOIN core.orders o ON o.id = s.order_id WHERE o.reference = $1",
      [reference],
    );
    expect(settled.rows[0]?.n).toBe(1);
  });
});
