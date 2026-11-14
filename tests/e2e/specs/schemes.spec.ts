import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { cms, signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Step 5.4 DONE WHEN: all scheme frames and states are reachable and match; the eligibility checker returns results
// only from stored rules, and with no rules it says so; every scheme page has a working official-portal link and a
// last-checked date. Each test makes its own schemes, so it runs with sample content hidden (CI).

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const tag = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const ANSWERS = "organisation=manufacturer&state=odisha&activity=electrolysers&size=small&startup=no&stage=pilot";

test("a scheme page shows its official source, last-checked date and status; the hub lists and filters it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const created = await cms(page.request, "POST", "schemes", {
    _status: "published",
    name: `Odisha electrolyser support ${t}`,
    runBy: "OREDA",
    states: ["odisha"],
    whoCanApply: ["Electrolyser manufacturers"],
    benefitTypes: ["Capital subsidy"],
    nextDeadline: inDays(30),
    summary: "Capital support for electrolyser lines.",
    sourceUrl: "https://example.org/oreda/scheme",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const id = created.body.doc?.id;
  expect(
    (await cms(page.request, "POST", `schemes/${String(id)}/verify`, { note: "Checked the portal." })).status,
  ).toBe(200);
  const slug = (created.body.doc as { slug?: string } | undefined)?.slug ?? "";

  await page.goto(`/opportunities/schemes/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Odisha electrolyser support ${t}`);
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
  const source = page.getByRole("link", { name: /example\.org\/oreda\/scheme/ });
  await expect(source).toHaveAttribute("href", "https://example.org/oreda/scheme");
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(page.getByLabel("Official sources")).toContainText("Last verified");

  await page.goto(`/opportunities/schemes?state=odisha&benefit=Capital+subsidy&q=${t}#all`);
  await expect(page.getByRole("heading", { name: "All schemes" })).toBeVisible();
  // Open schemes also show under "Open now"; the filtered list is All schemes.
  const all = page.locator("section").filter({ has: page.getByRole("heading", { name: "All schemes" }) });
  await expect(all.getByRole("article").filter({ hasText: t })).toHaveCount(1);
  await page.goto(`/opportunities/schemes?state=odisha&benefit=Grant&q=${t}#all`);
  await expect(page.getByText("No schemes match these filters")).toBeVisible();

  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("the eligibility checker matches only on stored, checked rules", async ({ page }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const scheme = (name: string, rules: Record<string, unknown>) =>
    cms(page.request, "POST", "schemes", {
      _status: "published",
      name: `${name} ${t}`,
      runBy: "MNRE",
      nextDeadline: inDays(30),
      summary: "Test scheme.",
      sourceUrl: "https://example.org/mnre",
      eligibilityRules: rules,
    });
  // One scheme whose checked rules fit the answers, one that fails a rule, one whose rules aren't checked yet.
  expect(
    (
      await scheme("Fits", {
        checked: true,
        organisations: ["manufacturer"],
        states: ["odisha"],
        checkNext: ["Read the notice"],
      })
    ).status,
  ).toBe(201);
  expect((await scheme("Wrong state", { checked: true, states: ["kerala"] })).status).toBe(201);
  expect((await scheme("Unchecked", { checked: false, organisations: ["manufacturer"] })).status).toBe(201);

  await page.goto(`/opportunities/eligibility?${ANSWERS}`);
  const results = page.getByRole("main");
  await expect(results).toContainText(`Fits ${t}`);
  await expect(results).not.toContainText(`Wrong state ${t}`);
  await expect(results).not.toContainText(`Unchecked ${t}`);
  const card = page.getByRole("listitem").filter({ hasText: `Fits ${t}` });
  await expect(card).toContainText("Strong match");
  await expect(card).toContainText("Open to equipment manufacturers");
  await expect(card).toContainText("Your plant is in Odisha");
  await expect(card).toContainText("Read the notice");
  await expect(results).toContainText("Indicative only");
});

test("the checker walks through six questions to results", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/opportunities/eligibility");
  await expect(page.getByRole("heading", { name: "Which hydrogen schemes could fit you?" })).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  const pick = async (option: string) => {
    await page.getByLabel(option).check();
    await page.getByRole("button", { name: /Continue|See my matches/ }).click();
  };
  await expect(page.getByText("Question 1 of 6")).toBeVisible();
  await pick("Equipment manufacturer");
  await page.getByRole("combobox", { name: "State" }).selectOption("odisha");
  await page.getByRole("button", { name: "Continue" }).click();
  await pick("Electrolysers and stacks");
  await pick("Small (MSME registered)");
  await pick("No");
  await expect(page.getByText("Question 6 of 6")).toBeVisible();
  await pick("Pilot or prototype");
  await expect(page).toHaveURL(new RegExp(ANSWERS.replace(/&/g, ".*")));
  await expect(page.getByText("Your answers:")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit answers" })).toBeVisible();
});

test("the SIGHT tracker, state pages, compare and hubs are reachable; old SIGHT links redirect", async ({ page }) => {
  for (const [path, heading] of [
    ["/opportunities/sight", "SIGHT programme tracker"],
    ["/states/maharashtra", "Hydrogen in Maharashtra"],
    ["/states/compare?s=maharashtra&s=gujarat", "Compare state hydrogen policies"],
    ["/states/hubs", "Green hydrogen hubs and hydrogen valleys"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
  await page.goto("/tracker/sight");
  await expect(page).toHaveURL(/\/opportunities\/sight$/);
  await page.goto("/opportunities/schemes/sight");
  await expect(page).toHaveURL(/\/opportunities\/sight$/);
  const csv = await page.request.get("/states/compare/csv?s=maharashtra&s=gujarat");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain('"Policy and year"');
});
