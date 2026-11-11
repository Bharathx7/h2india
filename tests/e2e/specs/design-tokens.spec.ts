import { expect, test } from "@playwright/test";

// Playbook step 2.1 and 2.2 "done when" checks, on the generated tokens page.

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/tokens");
  await page.evaluate(() => document.fonts.ready);
});

test("semantic classes resolve to the Figma colours", async ({ page }) => {
  const colour = (cls: string, prop: "color" | "backgroundColor") =>
    page.evaluate(
      ([c, p]) => {
        const el = document.createElement("span");
        el.className = c;
        document.body.append(el);
        const value = getComputedStyle(el)[p];
        el.remove();
        return value;
      },
      [cls, prop] as const,
    );
  expect(await colour("bg-accent", "backgroundColor")).toBe("rgb(48, 208, 96)"); // fresh/500 #30D060
  expect(await colour("text-primary", "color")).toBe("rgb(27, 33, 38)"); // ink/900 #1B2126
  expect(await colour("bg-subtle", "backgroundColor")).toBe("rgb(242, 244, 245)"); // ink/50 #F2F4F5
});

test("the three fonts load and carry the rupee sign, subscript two and arrow", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const families = ["manrope", "inter", "plexMono"];
    await Promise.all(families.map((f) => document.fonts.load(`16px ${f}`, "₹₂→×•")));
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
  });
  for (const family of ["manrope", "inter", "plexMono"]) expect(result).toContain(family);
  await expect(page.getByTestId("glyph-check")).toContainText("H₂ India ₹48,79,400");
});

test("text styles match the Figma values", async ({ page }) => {
  const h1 = page.getByRole("heading", { level: 1, name: "Foundations" });
  await expect(h1).toHaveCSS("font-size", "36px");
  await expect(h1).toHaveCSS("font-weight", "800");
  await expect(h1).toHaveCSS("line-height", "43.2px");
});
