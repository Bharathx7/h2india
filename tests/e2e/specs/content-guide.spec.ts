import { expect, test } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Founder (20 Nov 2026: make the CMS easy to follow): the article editor says what happens next and lists what is
// still needed before review; record forms list their required fields and keep Save in reach once something changed.
// Desktop only (627:1001).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await ownIp(context, info);
});

test("the article editor shows the next step and stops an unfinished submit", async ({ page }) => {
  test.setTimeout(90_000);
  await signInOperator(page, "Content editor");
  await page.goto("/admin/content/articles/new");
  await expect(page.getByRole("heading", { name: "Write, then save a draft" })).toBeVisible();
  await page.getByLabel("Headline").fill(`Checklist check ${String(Date.now())}`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/articles\/\d+$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Submit for review/ })).toBeVisible();
  const checklist = page.getByRole("list", { name: "Checklist" });
  await expect(checklist.getByText("Headline")).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/Before you submit, add: .*At least one author.*At least one source/)).toBeVisible();
  // Still a draft: nothing was sent.
  await expect(page.getByRole("button", { name: "Submit for review" })).toBeVisible();
});

test("a record form lists its required fields and keeps Save in reach", async ({ page }) => {
  await signInOperator(page, "Content editor");
  await page.goto("/admin/content/glossary/new");
  const required = page
    .getByRole("region", { name: "Required fields" })
    .or(page.locator("section", { has: page.getByRole("heading", { name: "Required fields" }) }));
  await expect(required.first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Unsaved changes" })).toHaveCount(0);
  await page.getByLabel("Term").fill(`Guide term ${String(Date.now())}`);
  const bar = page.getByRole("region", { name: "Unsaved changes" });
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Save now" })).toBeVisible();
});
