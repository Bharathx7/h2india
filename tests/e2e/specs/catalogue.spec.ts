import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";
import { expectStates } from "../helpers/states";

// Step 6.1: admin Catalogue · Taxonomy (636:596) and Dialog · Add attribute (637:417); restructured by the founder
// (20 Nov 2026) into Overview · Categories · Applications · Requests, one page per category, "product fields". DONE WHEN: an operator can add
// an attribute and it appears as a filter without a deploy (the schema is read live: the new row is filterable at
// once); a value outside the range is refused (unit and integration tests); the seeded examples are flagged sample.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
// The back office is desktop only (627:1001): Catalogue now has the larger-screen cover like every admin page (founder
// QC, 17 Nov 2026), so the phone project runs these at desktop size, as backOfficeContext() does.
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

test("a catalogue moderator sees the launch schema and adds a category and an attribute", async ({ page }) => {
  await signInOperator(page, "Catalogue moderator");
  await page.goto("/admin/catalogue/categories?q=Diaphragm");
  await page.getByRole("region", { name: "Categories" }).getByRole("link", { name: "Diaphragm", exact: true }).click();

  // The one drawn schema: Systems › Compression systems › Diaphragm with its ten product fields.
  await expect(page.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Diaphragm" })).toBeVisible();
  const table = page.getByRole("region", { name: "Product fields for Diaphragm" });
  // Grouped by display group (founder QC, 17 Nov 2026): ten attribute rows under their group headings.
  await expect(table.getByRole("rowheader")).toHaveCount(10);
  await expect(table.getByRole("rowheader", { name: "Flow rate" })).toBeVisible();
  await expect(table.getByRole("row", { name: /Flow rate/ })).toContainText("1–5,000");
  expect(await seriousIssues(page)).toEqual([]);
  // The wide table scrolls inside its own region; the page itself never scrolls sideways.
  // A phone browser widens its layout to fit wide content, so compare with the screen, not with innerWidth.
  const screen = page.viewportSize()?.width ?? 0;
  expect(await page.evaluate(() => Math.max(window.innerWidth, document.documentElement.scrollWidth))).toBe(screen);

  // Add a category in Equipment from Categories, then its first product field, through the drawn dialog.
  const name = `Test benches ${String(Date.now()).slice(-6)}`;
  await page.goto("/admin/catalogue/categories");
  await page.getByRole("button", { name: "Add category" }).click();
  const addCategory = page.getByRole("dialog", { name: "Add a category" });
  await addCategory.getByLabel("Class").selectOption({ label: "Equipment" });
  await addCategory.getByLabel("Name").fill(name);
  await addCategory.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/catalogue\/categories\/[\w-]+$/);
  await expect(page.getByRole("heading", { name: "No product fields yet" })).toBeVisible();

  await page.getByRole("button", { name: "Add product field" }).first().click();
  const dialog = page.getByRole("dialog", { name: `Add a product field to ${name}` });
  await dialog.getByRole("button", { name: "Add product field" }).click();
  await expect(dialog.getByText("Enter a name")).toBeVisible();

  await dialog.getByLabel("Name", { exact: true }).fill("Noise level");
  await dialog.getByRole("radio", { name: /^Number/ }).click();
  await dialog.getByLabel("Unit").fill("dB(A)");
  await dialog.getByLabel("Allowed values").fill("110–40");
  await dialog.getByLabel("Display group").selectOption({ label: "Physical" });
  await dialog.getByRole("switch", { name: "Filterable on search and category pages" }).click();
  await dialog.getByRole("switch", { name: "Ask for a test condition" }).click();
  await dialog.getByLabel("Test condition label").fill("At 1 m");
  await dialog.getByRole("button", { name: "Add product field" }).click();
  await expect(dialog.getByText("Put the lowest value first, like 40–110")).toBeVisible();
  await dialog.getByLabel("Allowed values").fill("40–110");
  await dialog.getByRole("button", { name: "Add product field" }).click();
  await expect(dialog).toBeHidden();

  const schema = page.getByRole("region", { name: `Product fields for ${name}` });
  const row = schema.getByRole("row", { name: /Noise level/ });
  await expect(row).toContainText("New");
  await expect(row).toContainText("40–110");
  await expect(row).toContainText("At 1 m");
  // Filterable straight away: no deploy between the change and the schema the filters read.
  await expect(row.getByRole("checkbox", { name: "Filterable: Noise level" })).toBeChecked();

  // Ticking a box waits in the Save bar (founder QC, 17 Nov 2026: each click used to save at once); Discard undoes it.
  const required = row.getByRole("checkbox", { name: "Required: Noise level" });
  await required.click();
  const bar = page.getByRole("region", { name: "Unsaved changes" });
  await expect(bar).toContainText("1 unsaved change");
  await bar.getByRole("button", { name: "Discard" }).click();
  await expect(bar).toBeHidden();
  await expect(required).not.toBeChecked();
  await required.click();
  await page.getByRole("region", { name: "Unsaved changes" }).getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 change saved" })).toBeVisible();
  await expect(required).toBeChecked();

  // Both changes are in the History tab.
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText(/added Noise level \(dB\(A\), test condition: at 1 m, optional\)/)).toBeVisible();
  await expect(page.getByText(/made Noise level required/)).toBeVisible();

  // Details tab: where it sits and whether it's on the site.
  await page.getByRole("link", { name: "Details" }).click();
  await expect(page.getByRole("button", { name: "Move to another main group" })).toBeVisible();
});

test("applications can be added, renamed and shown (founder QC)", async ({ page }) => {
  await signInOperator(page, "Catalogue moderator");
  await page.goto("/admin/catalogue");
  await page.getByRole("navigation", { name: "Catalogue" }).getByRole("link", { name: "Applications" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Applications" })).toBeVisible();
  const short = `Rail ${String(Date.now()).slice(-6)}`;
  await page.getByRole("button", { name: "Add application" }).click();
  const dialog = page.getByRole("dialog", { name: "Add an application" });
  await dialog.getByLabel("Full name").fill(`Hydrogen rail ${short}`);
  await dialog.getByLabel("Short name").fill(short);
  await dialog.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText(`${short} added. It's hidden until you show it.`)).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(short) });
  await expect(row).toContainText("Hidden");
  await row.getByRole("button", { name: `Show ${short}` }).click();
  await expect(row).toContainText("Shown");
});

test("operators without catalogue access get a 404", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const response = await page.goto("/admin/catalogue");
  expect(response?.status()).toBe(404);
});

test("the overview shows the catalogue at a glance and leads to a class", async ({ page }) => {
  await signInOperator(page, "Catalogue moderator");
  await page.goto("/admin/catalogue");
  const tabs = page.getByRole("navigation", { name: "Catalogue" });
  await expect(tabs.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classes" })).toBeVisible();
  await page.getByRole("link", { name: /^Systems/ }).click();
  await expect(page).toHaveURL(/\/admin\/catalogue\/categories\?class=systems/);
  await expect(
    page.getByRole("region", { name: "Categories" }).getByRole("link", { name: "Diaphragm", exact: true }),
  ).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);
  // Old links open the category's own page.
  const id = (
    await page
      .getByRole("region", { name: "Categories" })
      .getByRole("link", { name: "Diaphragm", exact: true })
      .getAttribute("href")
  )
    ?.split("/")
    .pop();
  await page.goto(`/admin/catalogue?category=${id ?? ""}`);
  await expect(page).toHaveURL(new RegExp(`/admin/catalogue/categories/${id ?? ""}$`));
});

test("the catalogue has its designed loading, error and empty states", async ({ page }) => {
  await signInOperator(page, "Super admin");
  await page.goto("/admin/catalogue/categories?q=Diaphragm");
  const href = await page
    .getByRole("region", { name: "Categories" })
    .getByRole("link", { name: "Diaphragm", exact: true })
    .getAttribute("href");
  await expectStates(page, href ?? "/admin/catalogue/categories");
});
