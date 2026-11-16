import { expect, test } from "../fixtures";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { deliverOrder, setup } from "../helpers/orders";
import { ownIp, withDb } from "../helpers/sign-in";

// Flow H (playbook step 10.12, page 18): the exception path. A delivery arrives damaged; the receiving contact records
// it; the buyer accepts part and reports a problem; the supplier responds; the buyer asks H2 Economy; an operator splits
// it; the refund is Processing, then Refunded when the simulated partner confirms. The ledger is checked at the end.
// Needs the app with FLAG_TRANSACTIONS=true, the worker and Mailpit.

test("flow H: damaged delivery, accept part, dispute, decision and refund", async ({
  page,
  browser,
  context,
}, info) => {
  test.skip(info.project.name !== "desktop-1440", "Runs once; the screens are checked at 390 by the page specs");
  test.setTimeout(300_000);
  await ownIp(context, info);
  const d = await setup();
  const { reference, supplierPage: s, token, code } = await deliverOrder(page, browser, d);

  // 1 The receiving contact records the damage on the phone page.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`/d/${token}`);
  await phone.getByRole("textbox", { name: "Digit 1 of 6" }).fill(code);
  await phone.getByRole("radio", { name: "Something is damaged" }).click();
  await phone.getByLabel(/What's wrong/).fill("The dryer housing is dented on the left side.");
  await phone.getByRole("button", { name: "Record delivery" }).click();
  await expect(phone.getByRole("heading", { name: "Receipt recorded" })).toBeVisible();

  // 2 The buyer accepts part and reports a problem for the rest.
  await page.reload();
  await page.getByRole("button", { name: "Report a problem" }).click();
  await page.getByLabel("What went wrong?").fill("Damaged in transit");
  await page.getByLabel("Details and photos").fill("The housing is dented; the controller works.");
  await page.getByLabel("What would fix it?").fill("Replace the housing");
  await page.getByLabel(/Accept part of the order/).fill("4,00,000");
  await page.getByRole("button", { name: "Report problem" }).click();
  await expect(page.getByRole("heading", { name: /Problem reported/ })).toBeVisible();

  // 3 The supplier disagrees; the buyer asks H2 Economy to decide.
  await s.reload();
  await expect(s.getByRole("heading", { name: "Your response" })).toBeVisible();
  await s.getByRole("radio", { name: "Disagree and explain" }).click();
  await s.getByLabel("Your reply").fill("It left our plant sealed and undamaged; see the dispatch photos.");
  await s.getByRole("button", { name: "Send response" }).click();
  await expect(s.getByText("It left our plant sealed")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Ask H2 Economy to decide" }).click();
  await expect(page.getByText(/H2 Economy is reviewing/)).toBeVisible();

  // 4 An operator splits it: part refunded to the buyer, the rest released to the supplier.
  const back = await backOfficeContext(browser);
  const op = await back.newPage();
  await signInOperator(op, "Super admin");
  await op.goto("/admin/orders?view=disputes");
  await op.getByRole("link", { name: reference }).click();
  await op.getByRole("radio", { name: /Split/ }).click();
  await op.getByLabel(/Refund to the buyer/).fill("2,00,000");
  await op.getByLabel(/Reason/).fill("Photos show transit damage to the housing only; refund the housing's share.");
  await op.getByRole("button", { name: "Record decision" }).click();
  await expect(op.getByText(/Resolved/).first()).toBeVisible();
  await back.close();

  // 5 The refund shows Processing, then Refunded once the partner confirms (the worker delivers its webhook).
  await page.reload();
  await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByText("Refunded", { exact: true }).count();
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0);

  // 6 The books agree: nothing left held on the order, and the ledger identity holds.
  await withDb(async (db) => {
    const held = await db.query<{ v: string }>(
      `SELECT coalesce(sum(credit_paise) - sum(debit_paise), 0)::text AS v FROM core.ledger_lines l
       JOIN core.orders o ON o.id = l.order_id WHERE o.reference = $1 AND l.account = 'held_for_acceptance'`,
      [reference],
    );
    expect(held.rows[0]?.v).toBe("0");
    const status = await db.query<{ status: string }>("SELECT status FROM core.orders WHERE reference = $1", [
      reference,
    ]);
    expect(status.rows[0]?.status).toBe("Accepted by buyer");
  });
});
