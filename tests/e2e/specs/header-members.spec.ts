import { expect, hydrated, test } from "../fixtures";
import { fillDetails, latestConfirmLink } from "../helpers/join";
import { setup } from "../helpers/orders";
import { signInExisting } from "../helpers/rfq";
import { enterCode, ensureAccount, newEmail, ownIp, requestCode } from "../helpers/sign-in";

// Public QC (16 Nov 2026), rounds 1 and 2. Header: the top strip and section nav hide while scrolling down, come back
// on any scroll up, and clicks in the main bar don't bring them back; the strip reads For Buyers, For Members, For
// Suppliers. Accounts: Buyer, Supplier and Member each have their own sign-in page (email code only, no passkey or
// Google) and sign-up page; signing in never creates an account; the wrong page signs people in to their own
// dashboard with a note.

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the header rows hide while scrolling down and come back on a scroll up", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The top strip and section nav are desktop only");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const strip = page.getByRole("link", { name: "For Members" }).first();
  await expect(nav).toBeVisible();
  await expect(strip).toBeVisible();
  // Move the pointer off the header, so nothing in it is hovered or focused.
  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, 1200);
  await expect(nav).toBeHidden();
  // A click in the main bar (here pressing on the logo) keeps just the main bar.
  await page.getByRole("link", { name: "H2 Economy home" }).first().hover();
  await page.mouse.down();
  await expect(nav).toBeHidden();
  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, -200);
  await expect(nav).toBeVisible();
  await expect(strip).toBeVisible();
});

test("the top strip reads For Buyers, For Members, For Suppliers; Sign in is Buyer sign in", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The top strip is desktop; the phone menu uses the same list");
  await page.goto("/news");
  const labels = await page
    .locator("header")
    .getByRole("link", { name: /^For (Buyers|Members|Suppliers)$/ })
    .allInnerTexts();
  expect(labels.slice(0, 3)).toEqual(["For Buyers", "For Members", "For Suppliers"]);
  await expect(page.locator("header").getByRole("link", { name: "Sign in" }).first()).toHaveAttribute(
    "href",
    "/buyer/sign-in",
  );
  await expect(page.locator("header").getByRole("link", { name: "List your company" }).first()).toHaveAttribute(
    "href",
    "/join/supplier",
  );
});

test("For Members leads to the member sign-up and sign-in pages", async ({ page }) => {
  await page.goto("/for-members");
  await expect(page.getByRole("heading", { level: 1, name: "Join H2 Economy as a member" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What members can do" })).toBeVisible();
  await page.getByRole("link", { name: "Join as a member" }).first().click();
  await expect(page).toHaveURL(/\/join\/member$/);
  await expect(page.getByText("Join as a member", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.goto("/for-members");
  await page.getByRole("link", { name: "Member sign in" }).first().click();
  await expect(page).toHaveURL(/\/member\/sign-in$/);
});

for (const [kind, title, join] of [
  ["buyer", "Buyer sign in", "Create a buyer account"],
  ["supplier", "Supplier sign in", "Create a supplier account"],
  ["member", "Member sign in", "Join as a member"],
] as const) {
  test(`${title}: email only, its own sign-up, and links to the other two`, async ({ page }) => {
    await page.goto(`/${kind}/sign-in`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with passkey" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: join })).toHaveAttribute("href", `/join/${kind}`);
    for (const other of ["buyer", "supplier", "member"].filter((k) => k !== kind)) {
      await expect(
        page.getByRole("link", { name: `${other[0]?.toUpperCase() ?? ""}${other.slice(1)} sign in` }),
      ).toHaveAttribute("href", `/${other}/sign-in`);
    }
  });
}

test("Create a supplier account starts at Find your company, with no choice step", async ({ page }) => {
  await page.goto("/join/supplier");
  await expect(page.getByText("Create a supplier account", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Find your company" })).toBeVisible();
  await expect(page.getByText("Step 1 of 3 · Your company")).toBeVisible();
  await expect(page.getByRole("link", { name: "Supplier sign in" })).toHaveAttribute("href", "/supplier/sign-in");
});

test("signing in never creates an account: an unknown email gets a Create an account email, not a code", async ({
  page,
}) => {
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
  const email = newEmail("no-account");
  await page.goto("/buyer/sign-in");
  await hydrated(page);
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(`We've sent an email to ${email}.`, { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a buyer account" })).toHaveAttribute("href", "/join/buyer");
  await expect
    .poll(async () => {
      const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
      const list = (await res.json()) as { messages?: { Subject: string }[] };
      return (list.messages ?? []).map((m) => m.Subject);
    })
    .toEqual(["No H2 Economy account for this email"]);
});

test("a new account from sign-up that never finished goes to its own sign-up page after sign-in", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
  const email = newEmail("unfinished");
  await ensureAccount(email);
  await page.goto("/member/sign-in");
  await enterCode(page, await requestCode(page, email));
  await expect(page).toHaveURL(/\/join\/member$/);
});

test("the wrong page signs a supplier in to their own dashboard, with a note", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
  const d = await setup();
  await page.goto("/buyer/sign-in");
  await enterCode(page, await requestCode(page, d.supplierEmail));
  await expect(page).toHaveURL(/\/supplier\?signed-in-as=buyer$/);
  await expect(page.getByText("You're signed in to your supplier account")).toBeVisible();
  await expect(page.getByText("This email isn't registered as a buyer.", { exact: false })).toBeVisible();
});

test("a new supplier confirms their email and carries on in Create a supplier account, not the shared Join", async ({
  page,
}) => {
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
  const email = newEmail("new-supplier");
  await page.goto("/join/supplier");
  await page.getByLabel("Company name or GSTIN").fill("zz-no-such-company");
  await page.getByRole("button", { name: /Create a new company/ }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await fillDetails(page, { email, name: "Pooja Nair" });
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await latestConfirmLink(page, email, sentAfter));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/join\/supplier\?step=company$/);
  await expect(page.getByText("Create a supplier account", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Company details" })).toBeVisible();
  // The shared /join sends a signed-in supplier back to their own page too.
  await page.goto("/join");
  await expect(page).toHaveURL(/\/join\/supplier$/);
});

test("signed in on the public site: role badge, bell panel, Dashboard; Request a quote only for buyers", async ({
  page,
  browser,
}, info) => {
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
  test.skip(info.project.name !== "desktop-1440", "The bell panel and avatar menu are in the desktop header");
  test.setTimeout(120_000);
  const d = await setup();
  const header = page.locator("header");

  // A buyer: badge "Buyer" (not a link), Request a quote, the bell opens a panel on the same page.
  await signInExisting(page, d.buyerEmail, "/news");
  await page.goto("/news");
  await expect(header.getByTestId("role-badge").first()).toHaveText("Buyer");
  // The badge is not a link (the top strip's "For Buyers" is, hence exact).
  await expect(header.getByRole("link", { name: "Buyer", exact: true })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Request a quote" }).first()).toBeVisible();
  await header
    .getByRole("button", { name: /^Notifications/ })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
  await expect(page).toHaveURL(/\/news$/);
  await page.keyboard.press("Escape");
  await header.getByRole("button", { name: /^Account: / }).click();
  await page.getByRole("menuitem", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/buyer$/);

  // A supplier: badge "Supplier", no Request a quote anywhere in the header or footer.
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  await ownIp(other, info);
  const s = await other.newPage();
  await signInExisting(s, d.supplierEmail, "/news");
  await s.goto("/news");
  await expect(s.locator("header").getByTestId("role-badge").first()).toHaveText("Supplier");
  await expect(s.locator("header, footer").getByRole("link", { name: "Request a quote" })).toHaveCount(0);
  await other.close();
});
