import { expect, test } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { signInMember } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";
import { expectStates } from "../helpers/states";

// Step 6.6 DONE WHEN: directory filters and the map show the same companies; a person without a consent flag never
// appears in lists, search or the map; keyboard users can use the list alternative to the map. Founder, 18 Nov 2026:
// browsing lives only in the member workspace; the website never links to it, and a single company profile stays on
// the website for signed-in people.
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
  await signInMember(page, newEmail("dir-list"));
  await page.goto(`/member/directory?q=${tag}&state=Kerala`);
  await expect(page.getByRole("link", { name: /View profile of Dir/ })).toHaveCount(2);
  await page.goto(`/member/directory?q=${tag}&state=Kerala&type=research`);
  await expect(page.getByRole("heading", { name: `Dir ${tag}b` })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Dir ${tag}a` })).toHaveCount(0);
  // Map view: same filter, same company, as a keyboard-usable list by state.
  await page.goto(`/member/directory?q=${tag}&state=Kerala&type=research&view=map`);
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
  await page.goto(`/member/directory/people?q=${tag}`);
  await expect(page.getByRole("link", { name: `Asha ${tag}` })).toHaveCount(0);
  expect((await page.goto(`/member/directory/people/asha-${tag}`))?.status()).toBe(404);

  const ok = await cms(page.request, "PATCH", `people/${String(draft.body.doc?.id)}`, {
    consentRecorded: true,
    consentEvidence: "Signed form, test",
    _status: "published",
  });
  expect(ok.status).toBe(200);
  await page.goto(`/member/directory/people?q=${tag}`);
  await expect(page.getByRole("link", { name: `Asha ${tag}` })).toBeVisible();
  expect(await page.locator("#main").innerText()).not.toMatch(/@/);
});

test("signed out, browsing goes to member sign-in and a profile asks to sign in", async ({ page }) => {
  for (const [path, member] of [
    ["/directory/companies?state=Kerala", "/member/directory?state=Kerala"],
    ["/directory/people", "/member/directory/people"],
    ["/directory/map", "/member/directory/map"],
    ["/member/directory/startups", "/member/directory/startups"],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(`/member/sign-in?next=${encodeURIComponent(member)}`);
  }
  const profile = `/directory/companies/no-such-${String(Date.now())}`;
  await page.goto(profile);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to see this company" })).toBeVisible();
  await expect(page.locator("#main").getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
    "href",
    `/sign-in?next=${encodeURIComponent(profile)}`,
  );
});

test("the website never links to the Directory, even for members; the member sidebar does", async ({
  page,
  isMobile,
}) => {
  await page.goto("/news");
  await expect(page.getByRole("button", { name: "Directory" })).toHaveCount(0);
  await expect(page.locator("footer").getByRole("link", { name: "Directory" })).toHaveCount(0);
  await signInMember(page, newEmail("dir-menu"));
  await page.goto("/news");
  await expect(page.getByRole("button", { name: "Directory" })).toHaveCount(0);
  await expect(page.locator('a[href^="/directory"]:not([href^="/directory/companies/"])')).toHaveCount(0);
  await expect(page.locator('a[href^="/member/directory"]')).toHaveCount(0);
  if (isMobile) {
    // On phones the sidebar sits behind the menu button; the page itself is the same.
    await page.goto("/member/directory");
  } else {
    await page.goto("/member");
    await page
      .getByRole("navigation", { name: /workspace$/ })
      .first()
      .getByRole("link", { name: "Directory" })
      .click();
    await expect(page).toHaveURL("/member/directory");
  }
  await expect(page.getByRole("navigation", { name: "Directory" }).getByRole("link", { name: "People" })).toBeVisible();
});

test("the directory has its designed states", async ({ page }) => {
  await signInMember(page, newEmail("dir-states"));
  await expectStates(page, "/member/directory");
});
