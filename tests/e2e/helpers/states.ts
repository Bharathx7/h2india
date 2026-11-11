import { expect, type Page } from "@playwright/test";

/**
 * Required-states rule (playbook step 2.5). Every page test that shows loaded data calls this with the page's
 * address. It forces each state with ?state= (development and staging only) and fails if a data section
 * renders a blank area instead of the designed state.
 */
export async function expectStates(page: Page, path: string): Promise<void> {
  const url = (state: string) => `${path}${path.includes("?") ? "&" : "?"}state=${state}`;

  await page.goto(url("loading"));
  const loading = page.locator("section[data-state=loading]");
  await expect(loading.first(), "a data section must show a skeleton while loading").toBeVisible();
  await expect(loading.first()).toHaveAttribute("aria-busy", "true");
  await expect(loading.first().locator(".shimmer").first(), "loading must use the Skeleton component").toBeVisible();

  await page.goto(url("error"));
  const error = page.locator("section[data-state=error]");
  await expect(error.first(), "a data section must have a designed error state").toBeVisible();
  await expect(error.first().getByRole("alert")).toBeVisible();
  await expect(error.first().getByRole("button", { name: "Try again" })).toBeVisible();

  await page.goto(url("empty"));
  const empty = page.locator("section[data-state=empty]");
  await expect(empty.first(), "a data section must say why it is empty").toBeVisible();
  await expect(empty.first().getByRole("heading")).toBeVisible();
}
