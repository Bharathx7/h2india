import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";
import { expectStates } from "../helpers/states";

// Step 6.1: admin Catalogue · Taxonomy (636:596) and Dialog · Add attribute (637:417). DONE WHEN: an operator can add
// an attribute and it appears as a filter without a deploy (the schema is read live: the new row is filterable at
// once); a value outside the range is refused (unit and integration tests); the seeded examples are flagged sample.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

test("a catalogue moderator sees the launch schema and adds a category and an attribute", async ({ page }) => {
  await signInOperator(page, "Catalogue moderator");
  await page.goto("/admin/catalogue");

  // The one drawn schema: Systems › Compression systems › Diaphragm with its ten attributes.
  await expect(page.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Diaphragm" })).toBeVisible();
  const table = page.getByRole("region", { name: "Attribute schema for Diaphragm" });
  await expect(table.getByRole("row")).toHaveCount(11);
  await expect(table.getByRole("rowheader", { name: "Flow rate" })).toBeVisible();
  await expect(table.getByRole("row", { name: /Flow rate/ })).toContainText("1–5,000");
  expect(await seriousIssues(page)).toEqual([]);
  // The wide table scrolls inside its own region; the page itself never scrolls sideways (390 included).
  // A phone browser widens its layout to fit wide content, so compare with the screen, not with innerWidth.
  const screen = page.viewportSize()?.width ?? 0;
  expect(await page.evaluate(() => Math.max(window.innerWidth, document.documentElement.scrollWidth))).toBe(screen);

  // Add a category in Equipment, then its first attribute, through the drawn dialog.
  const name = `Test benches ${String(Date.now()).slice(-6)}`;
  await page.getByRole("button", { name: "Add category" }).click();
  const addCategory = page.getByRole("dialog", { name: "Add a category" });
  await addCategory.getByLabel("Class").selectOption({ label: "Equipment" });
  await addCategory.getByLabel("Name").fill(name);
  await addCategory.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No attributes yet" })).toBeVisible();

  await page.getByRole("button", { name: "Add attribute" }).first().click();
  const dialog = page.getByRole("dialog", { name: `Add an attribute to ${name}` });
  await dialog.getByRole("button", { name: "Add attribute" }).click();
  await expect(dialog.getByText("Enter a name")).toBeVisible();

  await dialog.getByLabel("Name").fill("Noise level");
  await dialog.getByLabel("Type").selectOption({ label: "Number" });
  await dialog.getByLabel("Unit").fill("dB(A)");
  await dialog.getByLabel("Allowed values").fill("110–40");
  await dialog.getByLabel("Display group").selectOption({ label: "Physical" });
  await dialog.getByRole("switch", { name: "Filterable on search and category pages" }).click();
  await dialog.getByRole("switch", { name: "Ask for a test condition" }).click();
  await dialog.getByLabel("Test condition label").fill("At 1 m");
  await dialog.getByRole("button", { name: "Add attribute" }).click();
  await expect(dialog.getByText("Put the lowest value first, like 40–110")).toBeVisible();
  await dialog.getByLabel("Allowed values").fill("40–110");
  await dialog.getByRole("button", { name: "Add attribute" }).click();
  await expect(dialog).toBeHidden();

  const schema = page.getByRole("region", { name: `Attribute schema for ${name}` });
  const row = schema.getByRole("row", { name: /Noise level/ });
  await expect(row).toContainText("New");
  await expect(row).toContainText("40–110");
  await expect(row).toContainText("At 1 m");
  // Filterable straight away: no deploy between the change and the schema the filters read.
  await expect(row.getByRole("checkbox", { name: "Filterable: Noise level" })).toBeChecked();
  await expect(page.getByText(/added Noise level \(dB\(A\), test condition: at 1 m, optional\)/)).toBeVisible();

  // Toggling a box in the table saves and is recorded.
  await row.getByRole("checkbox", { name: "Required: Noise level" }).click();
  await expect(page.getByText(/made Noise level required/)).toBeVisible();
});

test("operators without catalogue access get a 404", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const response = await page.goto("/admin/catalogue");
  expect(response?.status()).toBe(404);
});

test("the catalogue has its designed loading, error and empty states", async ({ page }) => {
  await signInOperator(page, "Super admin");
  await expectStates(page, "/admin/catalogue");
});
