import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectStates } from "../helpers/states";

// Component gallery checks (playbook steps 2.3, 2.5 and 2.6) at 1440 and 390.

test("gallery has no accessibility violations", async ({ page }) => {
  await page.goto("/dev/ui");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
});

test("buttons follow Figma Button v2 sizes", async ({ page }) => {
  await page.goto("/dev/ui");
  const row = page.locator("[data-gallery=buttons]");
  const [small, medium, large] = await Promise.all(
    [0, 1, 2].map((i) => row.getByRole("button", { name: "Request a quote" }).nth(i).boundingBox()),
  );
  expect([small?.height, medium?.height, large?.height]).toEqual([32, 40, 48]);
});

test("checkbox, radio and switch work by keyboard", async ({ page }) => {
  await page.goto("/dev/ui#selection");
  const box = page.getByRole("checkbox", { name: "ISO 22734 certified" }).first();
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).toBeChecked();

  const sw = page.getByRole("switch", { name: "WhatsApp me when a quote arrives" });
  await sw.focus();
  await page.keyboard.press("Space");
  await expect(sw).toBeChecked();

  const online = page.getByRole("radio", { name: "Pay online" });
  await online.focus();
  // Radix moves focus on the next tick and checks the radio only while the arrow key is held, as a person does.
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowRight");
  await expect(page.getByRole("radio", { name: "Purchase order" })).toBeChecked();
});

test("one-time code fills every box on paste and moves on typing", async ({ page, context, browserName }) => {
  await page.goto("/dev/ui#selection");
  const group = page.getByRole("group", { name: "One-time code" }).first();
  const first = group.getByRole("textbox", { name: "Digit 1 of 6" });
  await first.click();
  await page.keyboard.type("12");
  await expect(group.getByRole("textbox", { name: "Digit 3 of 6" })).toBeFocused();
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(() => navigator.clipboard.writeText("482916"));
    await first.focus();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(group.getByRole("textbox", { name: "Digit 6 of 6" })).toHaveValue("6");
  }
});

test("data sections show loading, error and empty states", async ({ page }) => {
  await expectStates(page, "/dev/ui");
});

// Screenshot comparison per gallery section. Baselines must come from the CI browser, so this runs only when
// E2E_VISUAL=1 (see docs/design-fidelity.md for creating and approving baselines).
test.describe("visual", () => {
  test.skip(!process.env.E2E_VISUAL, "set E2E_VISUAL=1 to compare screenshots");
  for (const section of ["icons", "buttons", "forms", "selection", "feedback"]) {
    test(`gallery section ${section} matches its baseline`, async ({ page }) => {
      await page.goto("/dev/ui");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(`[data-gallery=${section}]`)).toHaveScreenshot(`${section}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.001,
      });
    });
  }
});
