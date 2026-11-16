import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "../fixtures";
import { latestSmsCode, newMobile, signInNew } from "../helpers/join";
import { addAuthenticator, enterCode, latestCode, newEmail, ownIp, requestCode, withDb } from "../helpers/sign-in";

// Step 3.5: account recovery (Figma 528:8), Flow I. Needs DATABASE_URL to set up the company.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to set up accounts");
test.skip(({ isMobile }) => isMobile, "recovery journeys run once, at desktop width");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** A person with an account, a verified mobile and a seat in a company (with another Admin when asked). */
async function person(page: Page, opts: { role: "Admin" | "Requester"; admin?: string }) {
  const email = newEmail(`rec-${opts.role.toLowerCase()}`);
  await signInNew(page, email);
  await page.goto("/sign-out");
  const mobile = newMobile();
  await withDb(async (db) => {
    const user = await db.query<{ id: string }>(
      "UPDATE core.users SET name = $2, mobile = $3, mobile_verified_at = now(), profile_type = 'buyer' WHERE email = $1 RETURNING id",
      [email, `${opts.role} Person`, `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`],
    );
    let org = opts.admin
      ? (
          await db.query<{ organisation_id: string }>(
            "SELECT m.organisation_id FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.email = $1",
            [opts.admin],
          )
        ).rows[0]?.organisation_id
      : undefined;
    if (!org) {
      org = (
        await db.query<{ id: string }>(
          "INSERT INTO core.organisations (id, kind, legal_name) VALUES (gen_random_uuid(), 'buyer', $1) RETURNING id",
          [`Recovery Test ${String(Date.now())}`],
        )
      ).rows[0]?.id;
    }
    await db.query(
      "INSERT INTO core.memberships (id, organisation_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, $3)",
      [org, user.rows[0]?.id, opts.role],
    );
    await db.query("DELETE FROM core.sign_in_throttle WHERE key LIKE $1", [`%${email}%`]);
  });
  return { email, mobile };
}

async function signedIn(browser: Browser, email: string) {
  const context = await browser.newContext();
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.211.${String(Date.now() % 250)}.${String(Math.floor(Math.random() * 250))}`,
  });
  const page = await context.newPage();
  await page.goto("/sign-in");
  await enterCode(page, await requestCode(page, email));
  const notNow = page.getByRole("button", { name: "Not now" });
  await expect(notNow).toBeVisible();
  await notNow.click();
  await expect(page).not.toHaveURL(/\/sign-in/);
  return { context, page };
}

test("lost passkey: both codes are needed, then a new passkey; the company admins are told", async ({ page }) => {
  const admin = await person(page, { role: "Admin" });
  const me = await person(page, { role: "Requester", admin: admin.email });
  await addAuthenticator(page);

  await page.goto("/forgot-access");
  await expect(page.getByRole("heading", { name: "Get back into your account" })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  await page.getByRole("link", { name: /I lost my passkey or device/ }).click();

  const sentAfter = Date.now() - 1000;
  await page.getByLabel("Work email").fill(me.email);
  await page.getByRole("button", { name: "Send codes" }).click();
  await expect(page.getByText("We sent codes to your work email and your mobile. Enter both.")).toBeVisible();
  await expect(page.getByText(new RegExp(`Code from SMS \\(\\+91 ••••• ${me.mobile.slice(5)}\\)`))).toBeVisible();

  // One factor is not enough.
  await page
    .getByRole("textbox", { name: "Digit 1 of 6" })
    .first()
    .fill(await latestCode(page, me.email, sentAfter, undefined, "verification"));
  await expect(page.getByText("Email verified")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

  await page
    .getByRole("textbox", { name: "Digit 1 of 6" })
    .first()
    .fill(await latestSmsCode(page, me.mobile, sentAfter));
  await expect(page.getByText("Mobile verified")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Create a new passkey" })).toBeVisible();
  await page.getByRole("button", { name: "Create passkey" }).click();
  await expect(page).not.toHaveURL(/forgot-access/);

  await expect
    .poll(async () => {
      const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${admin.email}"`)}`);
      return ((await res.json()) as { messages?: { Subject: string }[] }).messages?.map((m) => m.Subject) ?? [];
    })
    .toContain("Requester Person reset their passkey");
});

test("changed mobile: the new number waits for the company admin, who approves it", async ({ page, browser }) => {
  const admin = await person(page, { role: "Admin" });
  const me = await person(page, { role: "Requester", admin: admin.email });

  await page.goto("/forgot-access/mobile");
  const sentAfter = Date.now() - 1000;
  await page.getByLabel("Work email").fill(me.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page
    .getByRole("textbox", { name: "Digit 1 of 6" })
    .first()
    .fill(await latestCode(page, me.email, sentAfter, undefined, "verification"));
  await expect(page.getByText("Email verified")).toBeVisible();
  const fresh = newMobile();
  await page.getByLabel("New mobile number").fill(fresh);
  await page
    .getByRole("textbox", { name: "Digit 1 of 6" })
    .first()
    .fill(await latestSmsCode(page, fresh, sentAfter));
  await expect(page.getByText("New number verified")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for your admin" })).toBeVisible();

  // The admin gets an email with a link to review it.
  let link = "";
  await expect
    .poll(async () => {
      const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${admin.email}"`)}`);
      const m = ((await res.json()) as { messages?: { ID: string; Subject: string }[] }).messages?.find((x) =>
        x.Subject.startsWith("Approve"),
      );
      if (!m) return "";
      const full = (await (await page.request.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Text: string };
      link = /(http:\/\/\S+\/account\/recovery\/[0-9a-f-]+)/.exec(full.Text)?.[1] ?? "";
      return link;
    })
    .toContain("/account/recovery/");
  const adminSide = await signedIn(browser, admin.email);
  await adminSide.page.goto(link);
  await expect(adminSide.page.getByRole("heading", { name: "Approve a new mobile number" })).toBeVisible();
  await adminSide.page.getByRole("button", { name: "Approve" }).click();
  await expect(adminSide.page.getByText("This request is completed.")).toBeVisible();
  await adminSide.context.close();

  await expect(page.getByRole("heading", { name: "Your new number is saved" })).toBeVisible({ timeout: 15_000 });
  const saved = await withDb((db) => db.query("SELECT mobile FROM core.users WHERE email = $1", [me.email]));
  expect(saved.rows[0]).toEqual({ mobile: `+91 ${fresh.slice(0, 5)} ${fresh.slice(5)}` });
});
