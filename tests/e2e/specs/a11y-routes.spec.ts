import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { setup } from "../helpers/orders";
import { signInExisting } from "../helpers/rfq";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 12.4: axe on every page without a parameter, public and per workspace, at both widths. Serious and critical
// issues fail; lesser ones are listed in docs/accessibility/audit.md. Pages with a parameter (an article, a product,
// an order) are checked by their own specs. Results: docs/accessibility/audit.md.

const PUBLIC = [
  "/",
  "/about",
  "/about/mission",
  "/about/team",
  "/advertise",
  "/careers",
  "/contact",
  "/contact/partnerships",
  // Signed out, every /directory page is the sign-in prompt; the pages themselves are swept as a member below.
  "/directory/companies",
  "/events",
  "/events/past",
  "/events/submit",
  "/events/training",
  "/events/webinars",
  "/for-buyers",
  "/for-members",
  "/for-suppliers",
  "/forgot-access",
  "/forgot-access/email",
  "/forgot-access/mobile",
  "/forgot-access/passkey",
  "/help",
  "/join",
  "/knowledge",
  "/knowledge/glossary",
  "/knowledge/guides",
  "/knowledge/hydrogen-101",
  "/knowledge/insights",
  "/knowledge/media",
  "/knowledge/reports",
  "/knowledge/standards",
  "/legal/corrections",
  "/legal/corrections/suggest",
  "/legal/grievance-officer",
  "/marketplace",
  "/marketplace/brands",
  "/marketplace/compare",
  "/media-kit",
  "/news",
  "/news/submit",
  "/newsletter",
  "/opportunities",
  "/opportunities/eligibility",
  "/opportunities/grants",
  "/opportunities/jobs",
  "/opportunities/schemes",
  "/opportunities/sight",
  "/opportunities/tenders",
  "/opportunities/tenders/results",
  "/pricing",
  "/rfq/new",
  "/search?q=electrolyser",
  "/member/sign-in",
  "/sign-in",
  "/sitemap",
  "/states",
  "/states/compare",
  "/states/hubs",
  "/status",
  "/tracker",
  "/tracker/changes",
  "/tracker/methodology",
  "/tracker/sight",
  "/verification",
];

const MEMBER = [
  "/account",
  "/directory",
  "/directory/associations",
  "/directory/companies",
  "/directory/map",
  "/directory/people",
  "/directory/startups",
  "/member",
  "/member/alerts",
  "/member/applications",
  "/member/events",
  "/member/follows",
  "/member/hydrogen-101",
  "/member/preferences",
  "/member/profile",
  "/member/saved",
  "/notifications",
  "/knowledge/insights/write",
  "/opportunities/jobs/post",
];

const BUYER = [
  "/buyer",
  "/buyer/alerts",
  "/buyer/company",
  "/buyer/lists",
  "/buyer/messages",
  "/buyer/orders",
  "/buyer/payments",
  "/buyer/rfqs",
  "/cart",
];

const SUPPLIER = [
  "/supplier",
  "/supplier/analytics",
  "/supplier/bank",
  "/supplier/content",
  "/supplier/invoices",
  "/supplier/messages",
  "/supplier/orders",
  "/supplier/products",
  "/supplier/products/datasheet",
  "/supplier/products/import",
  "/supplier/products/new",
  "/supplier/products/quick",
  "/supplier/rfqs",
  "/supplier/storefront",
  "/supplier/team",
  "/supplier/verification",
];

const ADMIN = [
  "/admin",
  "/admin/catalogue",
  "/admin/compliance",
  "/admin/content",
  "/admin/content/calendar",
  "/admin/content/settings",
  "/admin/money",
  "/admin/orders",
  "/admin/queues",
  "/admin/queues/listings",
  "/admin/queues/rfqs",
  "/admin/reports",
  "/admin/settings",
  "/admin/settings/search",
  "/admin/users",
  "/admin/users/appeals",
  "/admin/users/audit",
  "/admin/users/roles",
  "/admin/verification",
];

async function sweep(page: Page, paths: string[]) {
  const problems: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("load");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    for (const v of result.violations.filter((x) => x.impact === "serious" || x.impact === "critical"))
      problems.push(
        `${path}: ${v.id} (${v.impact}) ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(", ")}`,
      );
  }
  return problems;
}

test.describe("accessibility of every page (step 12.4)", () => {
  test.beforeEach(async ({ context }, info) => {
    await ownIp(context, info);
  });

  // In groups, so each test stays well inside its time limit and a failure names a smaller set.
  for (let g = 0; g < PUBLIC.length; g += 12) {
    const group = PUBLIC.slice(g, g + 12);
    test(`public pages ${String(g / 12 + 1)} (${group[0] ?? ""} …)`, async ({ page }) => {
      test.setTimeout(300_000);
      expect(await sweep(page, group)).toEqual([]);
    });
  }

  test("member workspace", async ({ page }) => {
    test.setTimeout(300_000);
    await signInNew(page, newEmail("a11y-member"));
    expect(await sweep(page, MEMBER)).toEqual([]);
  });

  test("buyer and supplier workspaces", async ({ page, browser }, info) => {
    test.setTimeout(600_000);
    const d = await setup();
    await signInExisting(page, d.buyerEmail, "/buyer");
    expect(await sweep(page, BUYER)).toEqual([]);
    const supplier = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    await ownIp(supplier, info);
    const s = await supplier.newPage();
    await signInExisting(s, d.supplierEmail, "/supplier");
    expect(await sweep(s, SUPPLIER)).toEqual([]);
    await supplier.close();
  });

  test("back office", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "The back office is desktop only");
    test.setTimeout(600_000);
    await signInOperator(page, "Super admin");
    expect(await sweep(page, ADMIN)).toEqual([]);
  });
});

test.describe("keyboard, zoom and narrow screens (step 12.4)", () => {
  test("the first Tab offers Skip to content, and it moves focus to the page", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Same at both widths");
    await page.goto("/news");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(skip).not.toBeFocused();
  });

  test("main pages fit 320 px without sideways scrolling (WCAG 1.4.10)", async ({ browser }, info) => {
    test.skip(info.project.name !== "mobile-390", "Narrow screens only");
    test.setTimeout(180_000);
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    await ownIp(context, info);
    const page = await context.newPage();
    const wide: string[] = [];
    for (const path of [
      "/",
      "/news",
      "/marketplace",
      "/directory/companies",
      "/opportunities/tenders",
      "/events",
      "/tracker",
      "/sign-in",
      "/join",
      "/rfq/new",
      "/knowledge",
      "/opportunities/schemes",
    ]) {
      await page.goto(path);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width > 320) wide.push(`${path}: ${String(width)}px`);
    }
    await context.close();
    expect(wide).toEqual([]);
  });
});
