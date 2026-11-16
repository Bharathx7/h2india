import { expect, test, type Page } from "../fixtures";
import { asEditorInChief, publishedIssue, signInOperator } from "../helpers/cms";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 5.9 DONE WHEN: the cookie banner records a choice and analytics load only after consent, never for
// operators; newsletter sign-up is double opt-in with the drawn states, and mail carries one-click unsubscribe; the
// honeypot stops automated posts (50 rapid posts: protect.int.test.ts).

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

async function message(page: Page, email: string, subject: RegExp): Promise<{ ID: string; Subject: string } | null> {
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const list = ((await res.json()) as { messages?: { ID: string; Subject: string }[] }).messages ?? [];
    const hit = list.find((m) => subject.test(m.Subject));
    if (hit) return hit;
    await page.waitForTimeout(500);
  }
  return null;
}

async function freshVisitor(page: Page) {
  await page.context().clearCookies();
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `10.99.${String(Date.now() % 250)}.${String(Math.floor(Math.random() * 250))}`,
  });
}

test("the cookie banner records a choice; analytics wait for consent and skip operators", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await freshVisitor(page);
  await page.goto("/about");
  const banner = page.getByRole("region", { name: "We use cookies" });
  await expect(banner).toBeVisible();
  await expect(page.locator("html[data-analytics]")).toHaveCount(0);
  await banner.getByRole("button", { name: "Reject optional" }).click();
  await expect(banner).toHaveCount(0);
  expect((await page.context().cookies()).find((c) => c.name === "h2_consent")?.value).toMatch(/\.0\./);
  await page.reload();
  await expect(page.getByRole("region", { name: "We use cookies" })).toHaveCount(0);
  await expect(page.locator("html[data-analytics]")).toHaveCount(0);

  // Cookie preferences in the footer: switch analytics on.
  await page.goto("/legal/cookies#preferences");
  await page.getByRole("switch", { name: "Analytics cookies" }).click();
  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(page.getByText("Saved. Your choice applies straight away.")).toBeVisible();
  await expect(page.locator("html[data-analytics]")).toHaveCount(1);

  // An operator who accepted everything still gets no analytics.
  const op = await browser.newContext();
  const pop = await op.newPage();
  await signInOperator(pop, "Content editor");
  await pop.goto("/about");
  await pop.getByRole("region", { name: "We use cookies" }).getByRole("button", { name: "Accept all" }).click();
  await expect(pop.getByRole("region", { name: "We use cookies" })).toHaveCount(0);
  await pop.reload();
  await expect(pop.locator("html[data-analytics]")).toHaveCount(0);
  await op.close();
});

test("newsletter sign-up: check your inbox, confirm, already subscribed, one-click unsubscribe", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(150_000);
  await ownIp(page.context(), info);
  await asEditorInChief(browser, info, publishedIssue);
  await page.goto("/newsletter");
  await expect(page.getByRole("heading", { level: 1, name: "Newsletters" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Read issue/ }).first()).toBeVisible();
  const email = newEmail("weekly");
  await page.getByRole("textbox", { name: "Your work email" }).first().fill(email);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Subscribe" }).first().click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/confirmation link to \w••••@example\.com/)).toBeVisible();

  const confirm = await message(page, email, /India H₂ Weekly/);
  expect(confirm).not.toBeNull();
  const html = (await (await page.request.get(`${MAILPIT}/api/v1/message/${confirm?.ID ?? ""}`)).json()) as {
    HTML: string;
  };
  const link = /href="([^"]*\/newsletter\/confirm\?token=[^"]+)"/.exec(html.HTML)?.[1]?.replace(/&amp;/g, "&");
  expect(link).toBeTruthy();
  await page.goto(link ?? "/");
  await expect(page.getByRole("heading", { name: "You’re subscribed" })).toBeVisible();

  // Signing up again shows Already subscribed.
  await page.goto("/newsletter");
  await page.getByRole("textbox", { name: "Your work email" }).first().fill(email);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Subscribe" }).first().click();
  await expect(page.getByRole("heading", { name: "You're already subscribed" })).toBeVisible({ timeout: 15_000 });

  // The welcome email carries one-click unsubscribe headers; a mail app's POST unsubscribes at once.
  const welcome = await message(page, email, /Welcome|You’re in|You're in/);
  expect(welcome).not.toBeNull();
  const headers = (await (
    await page.request.get(`${MAILPIT}/api/v1/message/${welcome?.ID ?? ""}/headers`)
  ).json()) as Record<string, string[]>;
  expect(headers["List-Unsubscribe-Post"]?.[0]).toBe("List-Unsubscribe=One-Click");
  const target = /<([^>]+)>/.exec(headers["List-Unsubscribe"]?.[0] ?? "")?.[1] ?? "";
  const res = await page.request.post(target, { form: { "List-Unsubscribe": "One-Click" } });
  expect(res.status()).toBe(200);
  await page.goto(target);
  await expect(page.getByRole("heading", { name: "Unsubscribe from India H₂ Weekly?" })).toBeVisible();
});

test("a filled honeypot or a form sent too fast is refused", async ({ page }, info) => {
  test.setTimeout(90_000);
  await ownIp(page.context(), info);
  await page.goto("/contact");
  await page.getByPlaceholder("Full name").fill("Bot Example");
  await page.getByPlaceholder("you@company.com").fill(newEmail("bot"));
  await page.getByPlaceholder("Company name").fill("Bots Inc");
  await page.getByRole("textbox", { name: "Message" }).fill("Buy cheap things from our site today please.");
  await page.locator('input[name="website"]').fill("http://spam.example", { force: true });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Too many forms from here. Try again in an hour.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Thanks, we've got your message" })).toHaveCount(0);
});
