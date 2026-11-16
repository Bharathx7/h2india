import { expect, test, type Page } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Flow G (Figma page 18; playbook step 11.2 DONE WHEN): an organiser submits an event, an operator moderates and
// publishes it, the event is listed and the organiser gets Your event is live (831:1080). Needs the app and Mailpit.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.use({ video: "on" });

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function mailed(page: Page, to: string, subject: RegExp) {
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=20`,
        );
        const list = (await res.json()) as { messages?: { Subject: string }[] };
        return (list.messages ?? []).some((m) => subject.test(m.Subject));
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

test("flow G: an event is submitted, moderated, published and the organiser told", async ({ page, browser }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the back office is desktop only (627:1001)");
  test.setTimeout(240_000);
  const t = String(Date.now()).slice(-6);
  const title = `Safe hydrogen storage workshop ${t}`;
  const email = newEmail("flow-g");
  await signInNew(page, email);
  await page.goto("/events/submit");
  await page.getByLabel("Event title").fill(title);
  await page.getByLabel("Event type").selectOption("Workshop and training");
  await page
    .getByLabel("Description")
    .fill("A one-day workshop on safe hydrogen storage for plant engineers, with a visit to our test bay.");
  const day = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await page.getByLabel("Start date").fill(day);
  await page.getByLabel("End date").fill(day);
  await page.getByLabel("Venue and city").fill("Test facility, Ratnagiri");
  await page.getByRole("textbox", { name: "Organiser" }).fill("Konkan Test Works");
  await page.getByLabel("Ticket or registration link").fill("https://example.org/workshop");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, your event is under review" })).toBeVisible({
    timeout: 15_000,
  });

  const op = await browser.newContext();
  const opPage = await op.newPage();
  await signInOperator(opPage, "Super admin");
  await opPage.goto("/admin/queues/events");
  await opPage.getByRole("link", { name: new RegExp(`Review ${title}`) }).click();
  await expect(opPage.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await opPage.getByRole("button", { name: "Approve and publish" }).click();
  await expect(opPage).toHaveURL(/\/admin\/queues\/events/);
  await op.close();

  await page.goto("/events");
  await expect(page.getByText(title).first()).toBeVisible();
  await mailed(page, email, new RegExp(`Your event is live: ${title}`));
});
