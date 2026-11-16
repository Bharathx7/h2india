import { expect, test, type Page } from "../fixtures";
import { enterCode, newEmail, ownIp, requestCode } from "../helpers/sign-in";

// Flow E (Figma page 18, playbook step 7.6): enthusiast to subscriber and member. Explainer article → glossary term
// → Hydrogen 101 chapter → newsletter sign-up → confirm and choose topics → member onboarding → home feed → a jobs
// alert. Content steps use whatever is published (each is skipped with a note when there is none). Runs at 1440 and
// 390, with video for the pull request.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.use({ video: "on" });

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function openFirst(page: Page, listing: string, prefix: string, step: string): Promise<boolean> {
  await page.goto(listing);
  const link = page.locator(`main a[href^='${prefix}']`).first();
  if (!(await link.count())) {
    test.info().annotations.push({ type: "skipped step", description: `${step}: nothing published` });
    return false;
  }
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return true;
}

test("flow E: a reader becomes a subscriber and a member", async ({ page }) => {
  test.setTimeout(240_000);

  // 1–3 Explainer article, a glossary term, a Hydrogen 101 chapter.
  await openFirst(page, "/news", "/news/", "Explainer article");
  await openFirst(page, "/knowledge/glossary", "/knowledge/glossary/", "Glossary term");
  await openFirst(page, "/knowledge/hydrogen-101", "/knowledge/hydrogen-101/", "Hydrogen 101 chapter");

  // 4 Newsletter sign-up.
  const email = newEmail("flow-e");
  await page.goto("/newsletter");
  await page.getByRole("textbox", { name: "Your work email" }).first().fill(email);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Subscribe" }).first().click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });

  // 5 Confirm from the email, then choose topics.
  let id = "";
  await expect
    .poll(
      async () => {
        const r = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const list = ((await r.json()) as { messages?: { ID: string; Subject: string }[] }).messages ?? [];
        id = list.find((m) => /H2 Economy Weekly/.test(m.Subject))?.ID ?? "";
        return id;
      },
      { message: "the confirmation email", timeout: 30_000 },
    )
    .not.toBe("");
  const html = ((await (await page.request.get(`${MAILPIT}/api/v1/message/${id}`)).json()) as { HTML: string }).HTML;
  const confirm = /href="([^"]*\/newsletter\/confirm\?token=[^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, "&") ?? "";
  await page.goto(new URL(confirm).pathname + new URL(confirm).search);
  await expect(page.getByRole("heading", { name: "You’re subscribed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create free account" })).toBeVisible();

  // 6 Member onboarding: the same address becomes a member.
  await page.goto("/sign-in");
  await enterCode(page, await requestCode(page, email));
  // A new person is offered a passkey ("Not now") and then Join H2 Economy, as in signInNew().
  const notNow = page.getByRole("button", { name: "Not now" });
  await expect(notNow.or(page.getByRole("heading", { name: "Join H2 Economy" }))).toBeVisible();
  if (await notNow.isVisible()) await notNow.click();
  await page.goto("/member");
  await expect(page).toHaveURL(/\/member\/welcome$/);
  await page.getByRole("radio", { name: /Enthusiast/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Electrolysers" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Go to my feed" }).click();

  // 7 Home feed.
  await expect(page).toHaveURL(/\/member$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your feed" })).toBeVisible();

  // 8 A jobs alert, from the jobs page.
  await page.goto("/opportunities/jobs");
  await page.getByRole("link", { name: "Create job alert" }).click();
  const dialog = page.getByRole("dialog", { name: "Create alert" });
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Save alert" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: /^Jobs/ }).first()).toBeVisible();
});
