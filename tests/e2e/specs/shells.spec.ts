import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures";

// Step 2.4: workspace shells from Figma 194:1190 and 194:1191.

test("each workspace shows its navigation groups", async ({ page, isMobile }) => {
  test.skip(isMobile, "the full sidebar is checked at desktop width; phones use the menu drawer");
  const expected: Record<string, string[]> = {
    supplier: ["Catalogue", "Selling", "Business", "Company"],
    buyer: ["Buying", "Lists and alerts", "Company"],
    admin: ["Manage", "Commerce", "System"],
    member: ["Following", "Learning", "Account", "Explore"],
  };
  for (const [area, headings] of Object.entries(expected)) {
    await page.goto(`/dev/shells/workspace?area=${area}`);
    const nav = page.getByRole("navigation", { name: new RegExp(`${area} workspace`, "i") });
    for (const h of headings) await expect(nav.locator("p").filter({ hasText: new RegExp(`^${h}$`) })).toBeVisible();
  }
});

test("workspace shell has no accessibility violations", async ({ page }) => {
  await page.goto("/dev/shells/workspace?area=supplier");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
});

test("on a phone the menu drawer traps focus and returns it on close", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("/dev/shells/workspace?area=member");
  const open = page.getByRole("button", { name: "Open menu" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Member menu" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 30; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});

// Site chrome (Site header 25:635, Mega menu 369:7387, Footer v2 153:179, Cookie banner 53:1455).

test("site chrome has no accessibility violations, logged out and logged in", async ({ page }) => {
  for (const u of ["0", "1"]) {
    await page.goto(`/dev/shells/site?user=${u}`);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  }
});

test("mega menus work by keyboard only and close on Escape and on focus leaving", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop header");
  await page.goto("/dev/shells/site");
  const news = page.getByRole("button", { name: "News", exact: true });
  await news.focus();
  await page.keyboard.press("Enter");
  await expect(news).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("region", { name: "News menu" });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(news).toBeFocused();

  // Focus leaving the menu closes it (the earlier build kept it open).
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  // The promo button is the last link in the News menu; tabbing past it leaves the menu.
  await panel.getByRole("link", { name: "Subscribe" }).focus();
  await page.keyboard.press("Tab");
  await expect(panel).toBeHidden();
});

test("once scrolled, the strip hides and the main row with the section nav stays; the strip returns at the top and with focus", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop header");
  await page.goto("/");
  const header = page.locator("header").first();
  const nav = page.getByRole("navigation", { name: "Main" });
  const strip = page.locator("header").getByRole("link", { name: "For Members" }).first();
  const heightOf = () => header.evaluate((h) => Math.round(h.getBoundingClientRect().height));
  const mainTop = () =>
    page.evaluate(() => Math.round(document.querySelector("main")?.getBoundingClientRect().top ?? 0));
  // Design upgrade (19 Nov 2026): strip 36 + main row 72 + border 1.
  expect(await heightOf()).toBe(109);
  await expect(nav).toBeVisible();
  await expect(strip).toBeVisible();

  await page.mouse.wheel(0, 600);
  await expect(strip).toBeHidden();
  await expect(nav).toBeVisible();
  expect(await heightOf()).toBeLessThan(80);
  await expect(page.getByRole("link", { name: "H2 Economy home" }).first()).toBeInViewport();
  // Hiding the strip never moves the page: content sits where the scroll put it.
  const scrolled = await page.evaluate(() => Math.round(window.scrollY));
  expect(await mainTop()).toBe(109 - scrolled);

  // Keyboard focus in the header brings the strip back, so all links stay reachable. Public QC 5: only a real Tab
  // counts, so tab from the skip link into the header (the hidden strip is skipped; the logo takes focus).
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "H2 Economy home" }).first()).toBeFocused();
  await expect(strip).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(strip).toBeHidden();

  await page.mouse.wheel(0, -2000);
  await expect(strip).toBeVisible();
  expect(await heightOf()).toBe(109);
});

test("all header links stay visible between 1024 and 1279 wide", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop widths");
  for (const width of [1024, 1100, 1279]) {
    await page.setViewportSize({ width, height: 900 });
    for (const u of ["0", "1"]) {
      await page.goto(`/dev/shells/site?user=${u}`);
      const nav = page.getByRole("navigation", { name: "Main" });
      for (const name of ["Marketplace", "News", "Opportunities", "Knowledge", "Events"]) {
        await expect(nav.getByRole("button", { name, exact: true })).toBeInViewport();
      }
      await expect(page.getByRole("link", { name: "Request a quote" }).first()).toBeInViewport();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `no sideways scroll at ${String(width)}`).toBe(false);
    }
  }
});

test("on a phone the site menu traps focus and restores it on close", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("/dev/shells/site");
  const open = page.getByRole("button", { name: "Menu" });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});

test("the cookie choice is remembered and both choices carry equal weight", async ({ page }) => {
  await page.goto("/dev/shells/site");
  const reject = page.getByRole("button", { name: "Reject optional" });
  const accept = page.getByRole("button", { name: "Accept all" });
  const [r, a] = await Promise.all([reject.getAttribute("class"), accept.getAttribute("class")]);
  expect(r).toBe(a);
  await reject.click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Cookies" })).toBeHidden();
});
