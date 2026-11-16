import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cms, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 5.1 DONE WHEN: the home page shows every section logged out and logged in; forcing one module to fail shows its
// designed error while the rest of the page loads; the hero animation pauses on request and does not run with reduced
// motion; with comingSoon on, a visitor sees the pre-launch page and an operator (or someone on the allow-list) the
// real site. Also the newsletter sign-up brought forward from 5.9 (A46) and the early-listing form (A47).
// The run starts a second copy of the app on :3001 with FLAG_COMING_SOON=true (playwright.config.ts).

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const COMING_SOON = process.env.E2E_COMING_SOON_URL ?? "http://localhost:3001";

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const SECTIONS = [
  "Brands listed on H2 India",
  "India’s hydrogen sector, live",
  "Send one request to up to 5 verified suppliers",
  "Browse the marketplace",
  "Featured products",
  "One process, from request to GST invoice",
  "Opportunities this week",
  "Latest Indian hydrogen news",
  "India is building a 5 MMT green hydrogen economy",
  "Upcoming events",
  "Knowledge for everyone",
];

async function seesHome(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "India’s hydrogen ecosystem, in one place" })).toBeVisible();
  for (const name of SECTIONS) await expect(page.getByRole("heading", { name, exact: true })).toBeAttached();
}

test("logged out: every section, the drawn wording and the visitor's paths", async ({ page }) => {
  await page.goto("/");
  await seesHome(page);
  await expect(page.getByRole("heading", { name: "Choose your path" })).toBeVisible();
  await expect(
    page.getByText("2030 targets of the National Green Hydrogen Mission, MNRE, approved January 2023."),
  ).toBeVisible();
  // Live figures: open tenders are counted live with today's date (A45).
  await expect(page.getByTestId("live-figures")).toContainText("hydrogen tenders open this month");
  await expect(page.getByTestId("live-figures")).toContainText("H2 India tracker · as of");
  // The catalogue arrives in Stage 6: tiles without counts, Featured products empty (A43).
  await expect(page.getByRole("link", { name: /^Systems/ })).toBeVisible();
  await expect(page.getByTestId("featured-empty")).toContainText("Featured products are on the way");
  // No claims of our own (playbook WATCH OUT).
  await expect(page.getByRole("main")).not.toContainText(/\bfirst integrated\b|\bonly platform\b/i);
});

test("a published tender shows in Opportunities and counts in the live figures", async ({ page, isMobile }) => {
  test.skip(isMobile, "data checked once");
  await signInOperator(page, "Editor-in-chief");
  const title = `Home test tender ${String(Date.now())}`;
  const due = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const res = await cms(page.request, "POST", "tenders", {
    title,
    issuer: "Home Test Authority",
    tenderId: `HT/${String(Date.now())}`,
    states: ["gujarat"],
    bidDueAt: due,
    description: "A tender for the home page test.",
    sourceUrl: "https://example.org/home-test",
    _status: "published",
  });
  expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
  await page.goto("/");
  const tenders = page.getByTestId("tenders-module");
  await expect(tenders).toContainText(title);
  await expect(tenders).toContainText("Closing soon");
  await expect(
    tenders.getByRole("link", { name: "View documents ↗ (official portal, opens in a new tab)" }).first(),
  ).toHaveAttribute("target", "_blank");
});

test("forcing one module to fail shows its designed error while the rest of the page loads", async ({ page }) => {
  await page.goto("/?fail=tenders");
  const tenders = page.getByTestId("tenders-module");
  await expect(tenders.getByRole("alert")).toContainText("We couldn't load this week's tenders");
  await expect(tenders.getByRole("button", { name: "Try again" })).toBeVisible();
  // Everything else still loads.
  await expect(page.getByTestId("schemes-module").getByRole("alert")).toHaveCount(0);
  await seesHome(page);
  await expect(page.getByTestId("live-figures")).toBeVisible();

  await page.goto("/?fail=news,figures");
  await expect(page.getByTestId("news-module").getByRole("alert")).toContainText("We couldn't load the latest news");
  await expect(page.getByText("We couldn't load the latest figures")).toBeVisible();
  await expect(page.getByTestId("tenders-module").getByRole("alert")).toHaveCount(0);

  await page.goto("/?state=loading");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(3);
});

test.describe("motion", () => {
  test("with reduced motion the hero shows the still Buyers frame and nothing moves", async ({ page, isMobile }) => {
    test.skip(isMobile, "the network card shows from 1024 px");
    await page.goto("/");
    const hero = page.getByTestId("hero-network");
    await expect(hero).toHaveAttribute("data-focus", "buyers");
    await expect(hero).toHaveAttribute("data-running", "false");
    await expect(hero.getByRole("button", { name: "Pause animation" })).toHaveCount(0);
    await page.waitForTimeout(3000);
    await expect(hero).toHaveAttribute("data-focus", "buyers");
  });

  test("the hero loop keeps moving and has no pause button; the logo strip holds on hover", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the network card shows from 1024 px");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const hero = page.getByTestId("hero-network");
    await expect(hero).toHaveAttribute("data-running", "true");
    // Focus moves every 2.5 s (781:7247).
    await expect(hero).not.toHaveAttribute("data-focus", "buyers", { timeout: 4000 });
    // Founder change to F6, 16 Nov 2026: no pause buttons on the home page.
    await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);

    const strip = page.getByTestId("logo-marquee");
    if ((await strip.count()) > 0) {
      await expect(strip).toHaveAttribute("data-paused", "false");
      await strip.hover();
      await expect(strip).toHaveAttribute("data-paused", "true");
    }
  });
});

test("logged in: the greeting replaces Choose your path", async ({ page }) => {
  const email = newEmail("home-member");
  await signInNew(page, email);
  await page.goto("/");
  await seesHome(page);
  await expect(page.getByTestId("for-you-title")).toHaveText(/^For you/);
  await expect(page.getByRole("heading", { name: "Choose your path" })).toHaveCount(0);
});

test.describe("coming soon", () => {
  test.skip(({ isMobile }) => isMobile, "checked at desktop width; the page itself is checked at both widths below");

  test("a visitor sees the pre-launch page; an operator and the allow-list see the real site", async ({ page }) => {
    await page.goto(COMING_SOON);
    await expect(page.getByTestId("coming-soon")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("India’s hydrogen ecosystem platform is coming");

    // A signed-in member is still a visitor…
    const member = newEmail("allow");
    await signInNew(page, member);
    await page.goto(COMING_SOON);
    await expect(page.getByTestId("coming-soon")).toBeVisible();

    // …until a Super admin puts their email on the allow-list (A44).
    const admin = await page.context().browser()?.newContext();
    const adminPage = await admin?.newPage();
    if (!admin || !adminPage) throw new Error("no browser");
    await signInOperator(adminPage, "Super admin");
    await adminPage.goto(COMING_SOON);
    await expect(
      adminPage.getByRole("heading", { level: 1, name: "India’s hydrogen ecosystem, in one place" }),
    ).toBeVisible();
    const list = await cms(adminPage.request, "GET", "globals/prelaunch");
    expect(list.status).toBe(200);
    const current = (list.body as unknown as { allowList?: { email: string }[] }).allowList ?? [];
    const saved = await cms(adminPage.request, "POST", "globals/prelaunch", {
      allowList: [...current.map((a) => ({ email: a.email })), { email: member, note: "Home test" }],
    });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    await admin.close();

    await page.goto(COMING_SOON);
    await expect(
      page.getByRole("heading", { level: 1, name: "India’s hydrogen ecosystem, in one place" }),
    ).toBeVisible();
  });

  test("a Content editor can't change the allow-list", async ({ page }) => {
    await signInOperator(page, "Content editor");
    const res = await cms(page.request, "POST", "globals/prelaunch", { allowList: [{ email: "x@example.org" }] });
    expect(res.status).toBe(403);
  });
});

async function newestMail(page: Page, to: string, subject: string, after: number): Promise<string> {
  let text = "";
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=5`,
        );
        const list = (await res.json()) as { messages?: { ID: string; Subject: string; Created: string }[] };
        const m = (list.messages ?? []).find((x) => x.Subject === subject && new Date(x.Created).getTime() >= after);
        if (!m) return "";
        text = ((await (await page.request.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Text: string }).Text;
        return text;
      },
      { message: `"${subject}" to ${to}`, timeout: 15_000 },
    )
    .not.toBe("");
  return text;
}

test("newsletter sign-up on the Coming soon page: invalid, sent, confirmed, topics saved, already subscribed", async ({
  page,
}) => {
  await page.goto(COMING_SOON);
  const form = page.getByRole("form", { name: "Get India H₂ Weekly" });
  await form.getByLabel("Your work email").fill("ravi.k@greenfieldh2");
  await form.getByRole("button", { name: "Get India H₂ Weekly" }).click();
  await expect(form).toContainText("Enter a full email address, like name@company.in");

  const email = newEmail("weekly");
  const after = Date.now() - 1000;
  await form.getByLabel("Your work email").fill(email);
  await form.getByRole("button", { name: "Get India H₂ Weekly" }).click();
  await expect(page.getByTestId("newsletter-sent")).toContainText(`We’ve sent a link to ${email}`);

  const mail = await newestMail(page, email, "Confirm your India H₂ Weekly subscription", after);
  expect(mail).toContain("Every Monday at 08:00 IST");
  const link = /(http:\/\/\S+\/newsletter\/confirm\?token=\S+)/.exec(mail)?.[1] ?? "";
  expect(link).not.toBe("");
  await page.goto(link.replace(/^http:\/\/[^/]+/, COMING_SOON));
  await expect(page.getByRole("heading", { level: 1, name: "You’re subscribed" })).toBeVisible();
  const topics = page.getByRole("group", { name: "Topics" });
  await expect(topics.getByRole("button", { name: "Tenders & schemes" })).toHaveAttribute("aria-pressed", "true");
  await topics.getByRole("button", { name: "Jobs" }).click();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved")).toBeVisible();
  const row = await withDb((db) =>
    db.query<{ status: string; topics: string[] }>(
      "SELECT status, topics FROM core.newsletter_subscribers WHERE email = $1",
      [email],
    ),
  );
  expect(row.rows[0]?.status).toBe("confirmed");
  expect(row.rows[0]?.topics).toContain("jobs");
  await newestMail(page, email, "Welcome to India H₂ Weekly", after);

  // Signing up again sends a link to change topics instead (743:7293 "Already subscribed").
  await page.goto(COMING_SOON);
  const again = page.getByRole("form", { name: "Get India H₂ Weekly" });
  await again.getByLabel("Your work email").fill(email);
  await page.waitForTimeout(1200); // a form sent faster than a person types is refused (step 5.9)
  await again.getByRole("button", { name: "Get India H₂ Weekly" }).click();
  await expect(page.getByTestId("newsletter-already")).toContainText("You're already subscribed");
  await newestMail(page, email, "Change your India H₂ Weekly topics", after);

  // A broken link offers a new one.
  await page.goto(`${COMING_SOON}/newsletter/confirm?token=nope`);
  await expect(page.getByRole("heading", { level: 1, name: "This link doesn't work" })).toBeVisible();
});

test("a supplier asks to be listed early; operators see the request", async ({ page, isMobile }) => {
  test.skip(isMobile, "checked once");
  await page.goto(COMING_SOON);
  const form = page.getByRole("form", { name: "Get listed early" });
  await form.getByRole("button", { name: "Get listed early" }).click();
  await expect(form).toContainText("Enter your company's name");
  await expect(form).toContainText("Tick the box so we can contact you");
  const email = newEmail("early");
  await form.getByRole("textbox", { name: "Company" }).fill("Konkan Fuel Cells");
  await form.getByRole("textbox", { name: "Your name" }).fill("Meera Joshi");
  await form.getByRole("textbox", { name: "Work email" }).fill(email);
  await form.getByRole("textbox", { name: "Mobile" }).fill("98765 43210");
  await form.getByRole("combobox", { name: "What do you sell?" }).selectOption("components");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Get listed early" }).click();
  await expect(page.getByTestId("early-listing-sent")).toContainText(email);
  const row = await withDb((db) =>
    db.query<{ company: string; sells: string; consent_text: string }>(
      "SELECT company, sells, consent_text FROM cms.early_listings WHERE email = $1",
      [email],
    ),
  );
  expect(row.rows[0]).toMatchObject({ company: "Konkan Fuel Cells", sells: "components" });
  expect(row.rows[0]?.consent_text).toContain("H2 India may use these details");
});

test("Coming soon matches its drawn sections at this width", async ({ page }) => {
  await page.goto(COMING_SOON);
  for (const name of [
    "Get India H₂ Weekly",
    "Marketplace",
    "News and schemes",
    "Opportunities",
    "Are you a supplier? Get listed early",
  ]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  // The latest-issue preview waits for real issues (A48).
  await expect(page.getByText(/Latest issue/i)).toHaveCount(0);
});

test("no serious accessibility issues on the home and Coming soon pages", async ({ page }) => {
  for (const url of ["/", COMING_SOON]) {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      url,
    ).toEqual([]);
  }
});
