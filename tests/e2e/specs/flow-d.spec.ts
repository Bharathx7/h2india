import { expect, test } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { enterCode, newEmail, ownIp, requestCode } from "../helpers/sign-in";

// Flow D (Figma page 18, playbook step 7.6): tender alert to action. Tenders listing with filters → Create alert →
// sign-in prompt → member joins → alert saved → an operator publishes a matching tender → the Tender alert email
// arrives (Mailpit) → its link opens the tender. Needs the app, the worker (search sync and the alerts run every
// minute) and Mailpit. Runs at 1440 and 390, with video for the pull request.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.use({ video: "on" });

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("flow D: a tender alert leads to the tender", async ({ page, browser }, info) => {
  test.setTimeout(300_000);
  const word = `kandla${String(Date.now()).slice(-7)}${info.project.name.startsWith("mobile") ? "m" : "d"}`;

  // 1 Tenders listing with filters.
  await page.goto("/opportunities/tenders?state=gujarat");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 2 Create alert, signed out: the sign-in prompt comes first.
  await page.getByRole("link", { name: "Create alert", exact: true }).first().click();
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  // 3 The member joins with an email code.
  const email = newEmail("flow-d");
  await enterCode(page, await requestCode(page, email));
  // A new person is offered a passkey ("Not now") and then Join H2 India, as in signInNew().
  const notNow = page.getByRole("button", { name: "Not now" });
  await expect(notNow.or(page.getByRole("heading", { name: "Join H2 India" }))).toBeVisible();
  if (await notNow.isVisible()) await notNow.click();

  // 4 The alert is saved: instant, by email.
  await page.goto("/member/alerts?type=tenders");
  const dialog = page.getByRole("dialog", { name: "Create alert" });
  await dialog.getByLabel("Words to match").fill(word);
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("radio", { name: "Instant" }).click();
  await dialog.getByRole("button", { name: "Save alert" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Instant · email").first()).toBeVisible();

  // 5 An operator publishes a matching tender.
  const op = await browser.newContext();
  const opPage = await op.newPage();
  await signInOperator(opPage, "Content editor");
  const res = await cms(opPage.request, "POST", "tenders", {
    _status: "published",
    title: `Green hydrogen bunkering pilot at ${word}`,
    issuer: "Deendayal Port Authority",
    issuerType: "Ports",
    tenderId: `DPA/ENG/${word}`,
    description: "EPC for a green hydrogen bunkering pilot.",
    sourceUrl: "https://example.org/dpa/tender",
    states: ["gujarat"],
    bidDueAt: inDays(14),
  });
  expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
  await op.close();

  // 6 The Tender alert email arrives (search sync, then the every-minute alerts run).
  let messageId = "";
  await expect
    .poll(
      async () => {
        const r = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const list = ((await r.json()) as { messages?: { ID: string; Subject: string }[] }).messages ?? [];
        messageId = list.find((m) => /match(es)? your alert/.test(m.Subject))?.ID ?? "";
        return messageId;
      },
      { message: "the Tender alert email", timeout: 180_000, intervals: [5_000] },
    )
    .not.toBe("");
  const mail = (await (await page.request.get(`${MAILPIT}/api/v1/message/${messageId}`)).json()) as { HTML: string };
  expect(mail.HTML).toContain("Turn off this alert");
  const link = /href="([^"]*\/opportunities\/tenders\/[^"?]+)"/.exec(mail.HTML)?.[1] ?? "";
  expect(link).toContain(word.toLowerCase());

  // 7 The link opens the tender detail.
  await page.goto(new URL(link).pathname);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(word, "i") })).toBeVisible();
});
