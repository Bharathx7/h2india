import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import { asEditorInChief, cms, publishedHelpArticle, publishedLegalPage, signInOperator } from "../helpers/cms";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 5.8 DONE WHEN: a grievance gets a GRV ticket and the acknowledgement email, and its status shows only for the
// ticket and email together (and the core test, grievances.int.test.ts); contact and partnership messages reach the
// Submissions queue with a reference; legal pages show their version or say they're being finalised; help search
// has its no-results state; the pages have no serious axe issue.

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

async function mailTo(page: Page, email: string, subject: RegExp): Promise<string | null> {
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const list = ((await res.json()) as { messages?: { Subject: string }[] }).messages ?? [];
    const hit = list.find((m) => subject.test(m.Subject));
    if (hit) return hit.Subject;
    await page.waitForTimeout(500);
  }
  return null;
}

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

test("a complaint gets a ticket and an email; its status needs the ticket and email together", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/legal/grievance-officer?type=Listing");
  expect(await seriousIssues(page)).toEqual([]);
  await page.getByRole("button", { name: "Submit complaint" }).click();
  await expect(page.getByText("Paste the link, starting with https://").first()).toBeVisible({ timeout: 15_000 });

  const email = newEmail("complaint");
  await page.getByPlaceholder("https://").fill("https://example.org/marketplace/type-iv-cylinder");
  await page
    .getByPlaceholder("Describe the problem and what you'd like us to do")
    .fill("The listing shows a PESO certificate that expired in March; please check it.");
  await page.getByPlaceholder("Full name").fill("Suresh Natarajan");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: "Submit complaint" }).click();
  await expect(page.getByRole("heading", { name: "We've received your complaint" })).toBeVisible({
    timeout: 15_000,
  });
  const ticket = (await page.getByText(/^GRV-\d{4}-\d{5,}$/).textContent()) ?? "";
  expect(ticket).toMatch(/^GRV-\d{4}-\d{5,}$/);
  expect(await mailTo(page, email, new RegExp(`^${ticket}: we've received your complaint`))).not.toBeNull();

  await page.goto(`/legal/grievance-officer?ticket=${ticket}#check`);
  await expect(page.getByLabel("Ticket number")).toHaveValue(ticket);
  await page.getByLabel("Email you used").fill(newEmail("someone-else"));
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByText(/couldn't find that ticket for that email/)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Email you used").fill(email);
  await page.getByRole("button", { name: "Check status" }).click();
  const card = page.getByRole("status", { name: `Status of ${ticket}` });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByText("Listing · raised")).toBeVisible();
  await expect(card.getByText(/^By \d{1,2} \w{3} \d{4}$/)).toBeVisible();
  // Nothing from the complaint itself is shown.
  await expect(card.getByText(/PESO certificate/)).toHaveCount(0);
});

test("contact and partnership messages reach the queue with a reference", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.goto("/contact?about=supplier");
  expect(await seriousIssues(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Supplier onboarding" })).toHaveAttribute("aria-pressed", "true");
  await page.getByPlaceholder("Full name").fill("Rohan Mehta");
  await page.getByPlaceholder("you@company.com").fill(newEmail("contact"));
  await page.getByPlaceholder("Company name").fill("Konkan Test Works");
  await page.getByRole("textbox", { name: "Message" }).fill("We make Type IV cylinders and want to list them.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we've got your message" })).toBeVisible({ timeout: 15_000 });
  const reference = (await page.getByText(/^CON-\d{4}-\d{4,}$/).textContent()) ?? "";

  await page.goto("/contact/partnerships");
  await page.getByRole("button", { name: "Send proposal" }).click();
  await expect(page.getByText("Tell us about your proposal in a few sentences").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("textbox", { name: "Organisation" }).fill("Western India Hydrogen Association");
  await page.getByRole("radio", { name: /Industry body/ }).click();
  await page
    .getByPlaceholder("What would we do together, and what would each side bring?")
    .fill("Co-host a quarterly members' webinar and list our member companies in the directory.");
  await page.getByRole("textbox", { name: "Your name" }).fill("Prakash Joshi");
  await page.getByRole("textbox", { name: "Work email", exact: true }).fill(newEmail("partner"));
  await page.getByRole("button", { name: "Send proposal" }).click();
  await expect(page.getByText(/Proposal sent · reference PE-\d{4}-\d{4,}/)).toBeVisible({ timeout: 15_000 });

  const editor = await browser.newContext();
  const ep = await editor.newPage();
  await signInOperator(ep, "Content editor");
  const queue = await cms(ep.request, "GET", `submissions?where[reference][equals]=${reference}`);
  expect((queue.body as unknown as { docs: { kind: string; status: string }[] }).docs[0]).toMatchObject({
    kind: "contact",
    status: "Under review",
  });
  await editor.close();
});

test("legal pages, help search and the company pages", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await asEditorInChief(browser, info, async (request) => {
    await publishedLegalPage(request, "terms", "Terms of use");
    await publishedHelpArticle(request, "Inviting your team and setting roles");
  });
  await page.goto("/legal/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
  await expect(page.getByText(/Last updated .* · Version \d/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Version history" })).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);
  // A policy without a published version says so rather than showing made-up text.
  await page.goto("/legal/sponsored-content");
  await expect(page.getByText("This policy is being finalised")).toBeVisible();

  await page.goto("/help?q=liquid+hydrogen+trailer");
  await expect(page.getByRole("heading", { name: "No help articles match “liquid hydrogen trailer”" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse by category" })).toBeVisible();
  await page.goto("/help");
  await page.getByRole("searchbox").fill("team");
  await page.getByRole("searchbox").press("Enter");
  await page.getByRole("link", { name: "Inviting your team and setting roles" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Inviting your team and setting roles" })).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);

  for (const [path, heading] of [
    ["/about", "Build India’s hydrogen ecosystem"],
    ["/pricing", "Free for buyers. Simple for suppliers."],
    ["/verification", "How verification works"],
    ["/careers", "Work at H2 Economy"],
    ["/advertise", "Advertise and sponsor"],
    ["/sitemap", "Sitemap"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    expect(await seriousIssues(page), path).toEqual([]);
  }
});
