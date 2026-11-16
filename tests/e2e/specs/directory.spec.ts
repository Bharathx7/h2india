import { expect, test } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";
import { expectStates } from "../helpers/states";

// Step 6.6 DONE WHEN: directory filters and the map show the same companies; a person without a consent flag never
// appears in lists, search or the map; keyboard users can use the list alternative to the map. Public QC, 16 Nov 2026:
// the directory opens only for signed-in people.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function company(tag: string, state: string, type: string, verified: boolean) {
  await withDb(async (db) => {
    const org = (
      await db.query<{ id: string }>(
        `INSERT INTO core.organisations (id, kind, legal_name, verification, state) VALUES (gen_random_uuid(), 'supplier', $1, $2, $3) RETURNING id`,
        [`Dir ${tag}`, verified ? "Verified" : "Unverified", state],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.company_profiles (organisation_id, slug, trade_name, types, categories, claim_status) VALUES ($1, $2, $3, $4, $5, 'Unclaimed')`,
      [org, `dir-${tag}`, `Dir ${tag}`, [type], [`Tech ${tag.slice(0, 3)}`]],
    );
  });
}

test("the list and the map show the same filtered companies", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  await company(`${tag}a`, "Kerala", "Manufacturer", true);
  await company(`${tag}b`, "Kerala", "Research institute", false);
  await signInNew(page, newEmail("dir-list"));
  await page.goto(`/directory/companies?q=${tag}&state=Kerala`);
  await expect(page.getByRole("link", { name: /View profile of Dir/ })).toHaveCount(2);
  await page.goto(`/directory/companies?q=${tag}&state=Kerala&type=research`);
  await expect(page.getByRole("heading", { name: `Dir ${tag}b` })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Dir ${tag}a` })).toHaveCount(0);
  // Map view: same filter, same company, as a keyboard-usable list by state.
  await page.goto(`/directory/companies?q=${tag}&state=Kerala&type=research&view=map`);
  // The state-bubble map (A176, until M7) names each state's count; the list by state is behind a toggle.
  await expect(page.getByRole("img", { name: /Kerala 1/ })).toBeVisible();
  await page.getByText("Show the list instead").click();
  const map = page.getByRole("list", { name: /by state/ });
  await expect(map.getByRole("link", { name: `Dir ${tag}b` })).toBeVisible();
  await expect(map.getByRole("link", { name: `Dir ${tag}a` })).toHaveCount(0);
  await map.getByRole("link", { name: `Dir ${tag}b` }).focus();
  await expect(map.getByRole("link", { name: `Dir ${tag}b` })).toBeFocused();
});

test("a person without recorded consent can't be published and never appears", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  await signInOperator(page, "Editor-in-chief");
  const base = {
    name: `Asha ${tag}`,
    slug: `asha-${tag}`,
    role: "Engineer",
    affiliation: "Independent",
    state: "Kerala",
  };
  const refused = await cms(page.request, "POST", "people", { ...base, _status: "published" });
  expect(refused.status).toBeGreaterThanOrEqual(400);
  const draft = await cms(page.request, "POST", "people?draft=true", { ...base, _status: "draft" });
  expect(draft.status).toBe(201);
  await page.goto(`/directory/people?q=${tag}`);
  await expect(page.getByRole("link", { name: `Asha ${tag}` })).toHaveCount(0);
  expect((await page.goto(`/directory/people/asha-${tag}`))?.status()).toBe(404);

  const ok = await cms(page.request, "PATCH", `people/${String(draft.body.doc?.id)}`, {
    consentRecorded: true,
    consentEvidence: "Signed form, test",
    _status: "published",
  });
  expect(ok.status).toBe(200);
  await page.goto(`/directory/people?q=${tag}`);
  await expect(page.getByRole("link", { name: `Asha ${tag}` })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(/@/);
});

test("signed-out visitors are asked to sign in or join, and the menu has no Directory", async ({ page }) => {
  for (const path of [
    "/directory/companies",
    "/directory/people",
    "/directory/map",
    `/directory/companies/no-such-${String(Date.now())}`,
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to open the Directory" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
      "href",
      `/sign-in?next=${encodeURIComponent(path)}`,
    );
    await expect(page.getByRole("link", { name: "Join H2 India" })).toBeVisible();
  }
  await page.goto("/news");
  await expect(page.getByRole("button", { name: "Directory" })).toHaveCount(0);
  await expect(page.locator("footer").getByRole("link", { name: "Directory" })).toHaveCount(0);
});

test("signed in, the Directory menu is back", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The section nav is desktop; the phone menu reads the same list");
  await signInNew(page, newEmail("dir-menu"));
  await page.goto("/news");
  await expect(page.getByRole("button", { name: "Directory" })).toBeVisible();
});

test("the directory has its designed states", async ({ page }) => {
  await signInNew(page, newEmail("dir-states"));
  await expectStates(page, "/directory/companies");
});
