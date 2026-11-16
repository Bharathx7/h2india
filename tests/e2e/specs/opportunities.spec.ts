import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 5.5 DONE WHEN: tenders, grants and jobs list, filter and open as drawn; statuses follow the dates in India
// time; table and cards show the same tenders; awarded tenders show results; a company posts a job that stays a draft
// until an editor publishes it, and another company can't see it. Each test makes its own records, so it runs with
// sample content hidden (CI).

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const tag = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

async function tender(page: Page, t: string, data: Record<string, unknown>) {
  const res = await cms(page.request, "POST", "tenders", {
    _status: "published",
    issuer: "SECI",
    issuerType: "SECI",
    tenderId: `SECI/TEST/${t}`,
    description: `Scope of the ${t} tender.`,
    sourceUrl: "https://example.org/seci/tender",
    states: ["all-india"],
    ...data,
  });
  expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
  return res.body.doc as { id: number; slug: string };
}

test("tenders: statuses follow the dates, table and cards list the same tenders, filters narrow both", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(150_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  await tender(page, t, {
    title: `Compressor package ${t}`,
    sector: "Equipment",
    bidDueAt: inDays(3),
    valueBand: "₹10–100 crore",
  });
  await tender(page, t, {
    title: `Electrolyser supply ${t}`,
    sector: "Electrolysers",
    bidDueAt: inDays(20),
    extendedFrom: inDays(10),
  });
  await tender(page, t, {
    title: `Hub infrastructure ${t}`,
    sector: "EPC",
    bidDueAt: inDays(40),
    publishedAt: inDays(5),
  });
  await tender(page, t, { title: `Closed round ${t}`, sector: "Production", bidDueAt: inDays(-2) });

  await page.goto(`/opportunities/tenders?q=${t}`);
  await expect(page.getByRole("heading", { level: 1, name: "Hydrogen tenders in India" })).toBeVisible();
  await expect(page.getByText("2 tenders · open, closing soon or extended")).toBeVisible();
  if (isMobile) {
    // Phones always get cards (456:3152).
    await expect(page.getByRole("article")).toHaveCount(2);
  } else {
    const table = page.locator("table");
    await expect(table.getByRole("link", { name: `Compressor package ${t}`, exact: true })).toBeVisible();
    await expect(table.getByText("Closing soon").first()).toBeVisible();
    await expect(table.getByText("Extended")).toBeVisible();
    // The row opens to show the scope.
    await page.getByRole("button", { name: `Show details of Compressor package ${t}` }).click();
    await expect(page.getByText(`Scope of the ${t} tender.`).first()).toBeVisible();
  }
  expect(await seriousIssues(page)).toEqual([]);

  await page.goto(`/opportunities/tenders?q=${t}&as=cards`);
  await expect(page.getByRole("article")).toHaveCount(2);

  await page.goto(`/opportunities/tenders?q=${t}&status=Upcoming&status=Under+evaluation`);
  await expect(page.getByText("2 tenders", { exact: true })).toBeVisible();
  await expect(page.getByText("Upcoming", { exact: true }).filter({ visible: true }).last()).toBeVisible();
  await expect(page.getByText("Under evaluation", { exact: true }).filter({ visible: true }).last()).toBeVisible();

  await page.goto(`/opportunities/tenders?q=${t}&category=Refuelling+stations&state=kerala`);
  await expect(page.getByRole("heading", { name: "No open tenders match these filters" })).toBeVisible();
  // Signed in, it goes to alerts (step 7.3); signed out, through sign-in first (A71).
  await expect(page.getByRole("link", { name: "Create alert for these filters" })).toHaveAttribute(
    "href",
    /\/member\/alerts/,
  );
});

test("a tender page shows key dates and its portal; an awarded one shows results, also on the results page", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const open = await tender(page, t, {
    title: `Green ammonia round ${t}`,
    bidDueAt: inDays(5),
    extendedFrom: inDays(-5),
    keyDates: [{ label: "Pre-bid meeting", at: inDays(-20), note: "online" }],
    documents: [{ title: "Request for Selection", url: "https://example.org/seci/rfs", kind: "PDF" }],
  });
  await page.goto(`/opportunities/tenders/${open.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Green ammonia round ${t}`);
  await expect(page.getByText(/· extended from/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Documents on SECI portal/ })).toHaveAttribute(
    "href",
    "https://example.org/seci/tender",
  );
  await expect(page.getByText("Results not announced yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Track tender" }).first()).toHaveAttribute(
    "href",
    /\/member\/alerts\?tender=/,
  );
  expect(await seriousIssues(page)).toEqual([]);

  const won = await tender(page, t, {
    title: `Awarded round ${t}`,
    sector: "Production",
    bidDueAt: inDays(-60),
    result: {
      declaredAt: inDays(-10),
      winners: [{ name: `Winner Works ${t}`, capacity: "60,000 t/yr for 10 years", price: "₹52.25 per kg" }],
      bidders: "Not public",
      whatItMeans: "The price sits in the middle of earlier rounds.",
    },
  });
  await page.goto(`/opportunities/tenders/${won.slug}`);
  await expect(page.getByText("Awarded", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Results", exact: true })).toBeVisible();
  await expect(page.getByText("₹52.25 per kg").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow results" })).toBeVisible();

  await page.goto("/opportunities/tenders/results?category=Production");
  await expect(page.getByRole("link", { name: `Awarded round ${t}`, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: `Green ammonia round ${t}`, exact: true })).toHaveCount(0);
});

test("grants: the list starts with open and announced calls; a closed call points to the next one", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const make = async (title: string, data: Record<string, unknown>) => {
    const res = await cms(page.request, "POST", "grants", {
      _status: "published",
      title,
      funder: `F${t}`,
      howToApply: "Apply on the funder's portal.",
      sourceUrl: "https://example.org/funder/call",
      whoCanApply: ["Researchers"],
      themes: ["Materials and catalysts"],
      ...data,
    });
    expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
    return res.body.doc as unknown as { slug: string };
  };
  const open = await make(`Catalysts call ${t}`, {
    deadline: inDays(4),
    steps: [
      { step: "Register on the portal" },
      { step: "Submit a proposal", at: inDays(4) },
      { step: "Review", at: inDays(60) },
    ],
  });
  await make(`Centres call ${t}`, { deadline: inDays(60), statusOverride: "Announced", nextCallExpected: "Jan 2027" });
  const closed = await make(`Safety call ${t}`, { deadline: inDays(-5), nextCallExpected: "mid-2027" });

  await page.goto(`/opportunities/grants?funder=F${t}`);
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByText("Call expected Jan 2027")).toBeVisible();
  await page.goto(`/opportunities/grants?funder=F${t}&status=Next+round+expected`);
  await expect(page.getByRole("article")).toHaveCount(1);

  await page.goto(`/opportunities/grants/${open.slug}`);
  await expect(page.getByText("Closing soon").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Open official call/ })).toHaveAttribute(
    "href",
    "https://example.org/funder/call",
  );
  await expect(page.getByText("(current step)")).toHaveCount(1);
  expect(await seriousIssues(page)).toEqual([]);

  await page.goto(`/opportunities/grants/${closed.slug}`);
  await expect(page.getByText("This call has closed")).toBeVisible();
  await expect(page.getByRole("link", { name: "Set alert for the next call" })).toBeVisible();
});

async function companyUser(page: Page, name: string) {
  const email = newEmail("jobs");
  await signInNew(page, email);
  await withDb(async (db) => {
    const user = await db.query<{ id: string }>(
      "UPDATE core.users SET name = 'Job Poster', profile_type = 'supplier' WHERE email = $1 RETURNING id",
      [email],
    );
    const org = await db.query<{ id: string }>(
      "INSERT INTO core.organisations (id, kind, legal_name) VALUES (gen_random_uuid(), 'supplier', $1) RETURNING id",
      [name],
    );
    await db.query(
      "INSERT INTO core.memberships (id, organisation_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, 'Sales')",
      [org.rows[0]?.id, user.rows[0]?.id],
    );
  });
  return email;
}

test("a company posts a job: draft, preview, submit; it shows only after an editor publishes it", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto("/opportunities/jobs/post");
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  const t = tag();
  await companyUser(page, `Konkan Test Works ${t}`);
  await page.goto("/opportunities/jobs/post");
  await expect(page.getByRole("heading", { level: 1, name: "Post a job" })).toBeVisible();
  await expect(page.getByLabel("Posting as")).toContainText(`Konkan Test Works ${t}`);

  // Every required field is checked on the server.
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Enter the job title")).toBeVisible();

  await page.getByLabel("Job title").fill(`Commissioning engineer ${t}`);
  await page.getByLabel("Function").selectOption("Engineering");
  await page.getByLabel("Experience").selectOption("3–6 years");
  await page.getByLabel("Description").fill("Lead site commissioning of PEM electrolysers.");
  await page.getByPlaceholder("Add a skill").fill("Commissioning");
  await page.getByPlaceholder("Add a skill").press("Enter");
  await page.getByLabel("City").fill("Ratnagiri, Maharashtra");
  await page.getByRole("switch", { name: "Show a salary band" }).click();
  await page.getByLabel("From").fill("12");
  await page.getByLabel("To", { exact: true }).fill("18");
  await page.getByLabel("Careers page link").fill("https://careers.example.org/commissioning");
  // The live card shows what readers will see.
  await expect(page.getByText("₹12–18 lakh a year").first()).toBeVisible();

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Choose a closing date")).toHaveCount(0);
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/opportunities\/jobs\/post\?id=\d+/);
  const id = new URL(page.url()).searchParams.get("id") ?? "";

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Choose a closing date")).toBeVisible({ timeout: 15_000 });
  const closing = new Date(Date.now() + 20 * 86_400_000);
  await page
    .getByLabel("Closing date")
    .fill(closing.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page).toHaveURL(new RegExp(`/opportunities/jobs/post/preview\\?id=${id}`), { timeout: 15_000 });
  await expect(page.getByText("Preview: not published yet")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Commissioning engineer ${t}`);
  expect(await seriousIssues(page)).toEqual([]);

  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("heading", { name: "Job submitted for review" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^JOB-\d{4}-\d{4,}$/)).toBeVisible();

  // Not public yet.
  await page.goto("/opportunities/jobs");
  await expect(page.getByRole("link", { name: `Commissioning engineer ${t}` })).toHaveCount(0);

  // Another company can't open it.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await companyUser(otherPage, `Other Works ${t}`);
  const res = await otherPage.goto(`/opportunities/jobs/post/preview?id=${id}`);
  expect(res?.status()).toBe(404);
  await other.close();

  // An editor publishes it: now it's live, with JobPosting data.
  const editor = await browser.newContext();
  const editorPage = await editor.newPage();
  await signInOperator(editorPage, "Content editor");
  const queued = await cms(editorPage.request, "GET", `jobs/${id}?draft=true`);
  expect((queued.body as { post?: { state?: string } }).post?.state).toBe("Submitted for review");
  const published = await cms(editorPage.request, "PATCH", `jobs/${id}`, { _status: "published" });
  expect(published.status, JSON.stringify(published.body.errors)).toBe(200);
  await editor.close();

  await page.goto("/opportunities/jobs");
  await page.getByRole("link", { name: `Commissioning engineer ${t}` }).click();
  // Apply goes through /apply, which records the click for a signed-in member and sends on to the employer (A70).
  const apply = page.getByRole("link", { name: /Apply on company site/ });
  await expect(apply).toHaveAttribute("href", /\/opportunities\/jobs\/[^/]+\/apply$/);
  const hop = await page.request.get((await apply.getAttribute("href")) ?? "", { maxRedirects: 0 });
  expect(hop.headers().location).toBe("https://careers.example.org/commissioning");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld ?? "{}")).toMatchObject({ "@type": "JobPosting", title: `Commissioning engineer ${t}` });
});

test("jobs: expired jobs leave the list but keep a closed page; filters narrow the list", async ({ page }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const make = async (role: string, data: Record<string, unknown>) => {
    const res = await cms(page.request, "POST", "jobs", {
      _status: "published",
      role,
      company: `Co ${t}`,
      location: "Vadodara, Gujarat",
      states: ["gujarat"],
      description: "A sample role.",
      sourceUrl: "https://example.org/careers",
      postedAt: inDays(-3),
      ...data,
    });
    expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
    return res.body.doc as unknown as { slug: string };
  };
  await make(`Trainee ${t}`, { experience: "Students", jobType: "Internship", closesAt: inDays(30) });
  await make(`Senior engineer ${t}`, { experience: "6–10 years", function: "Engineering", closesAt: inDays(30) });
  const gone = await make(`Old role ${t}`, { experience: "3–6 years", closesAt: inDays(-1) });

  await page.goto("/opportunities/jobs?location=gujarat");
  await expect(page.getByRole("link", { name: `Trainee ${t}` })).toBeVisible();
  await expect(page.getByRole("link", { name: `Old role ${t}` })).toHaveCount(0);
  await page.goto("/opportunities/jobs?location=gujarat&students=1");
  await expect(page.getByRole("link", { name: `Senior engineer ${t}` })).toHaveCount(0);
  await expect(page.getByRole("link", { name: `Trainee ${t}` })).toBeVisible();
  await page.goto("/opportunities/jobs?location=gujarat&experience=7-plus");
  await expect(page.getByRole("link", { name: `Senior engineer ${t}` })).toBeVisible();
  await expect(page.getByRole("link", { name: `Trainee ${t}` })).toHaveCount(0);
  expect(await seriousIssues(page)).toEqual([]);

  await page.goto(`/opportunities/jobs/${gone.slug}`);
  await expect(page.getByText("This job is no longer taking applications")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications closed" })).toBeVisible();
  // A closed job carries no JobPosting (its breadcrumb trail still has BreadcrumbList data, step 5.10).
  await expect(page.locator('script[type="application/ld+json"]', { hasText: "JobPosting" })).toHaveCount(0);
});

test("the opportunities home lists what's closing and links every section", async ({ page }) => {
  test.setTimeout(90_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  await tender(page, t, { title: `Closing tender ${t}`, bidDueAt: inDays(2) });
  await page.goto("/opportunities");
  await expect(page.getByRole("heading", { level: 1, name: "Hydrogen opportunities in India" })).toBeVisible();
  await expect(page.locator("#closing").getByRole("link", { name: `Closing tender ${t}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start the checker" })).toHaveAttribute(
    "href",
    "/opportunities/eligibility",
  );
  await expect(page.getByRole("link", { name: /See all \d+ tenders/ })).toHaveAttribute(
    "href",
    "/opportunities/tenders",
  );
  expect(await seriousIssues(page)).toEqual([]);
});

test("list pages show their loading, error and empty states", async ({ page }) => {
  for (const path of ["/opportunities/tenders", "/opportunities/grants", "/opportunities/jobs"]) {
    await page.goto(`${path}?view=loading`);
    await expect(page.locator("[aria-busy=true]").first()).toBeVisible();
    await page.goto(`${path}?view=error`);
    await expect(page.getByText(/We couldn’t load/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
    await page.goto(`${path}?view=empty`);
    await expect(page.getByText(/No .* match these filters|No open jobs right now/).first()).toBeVisible();
  }
});
