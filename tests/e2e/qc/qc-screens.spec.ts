import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { expect, test } from "../fixtures";
import { signInMember } from "../helpers/join";
import { setup } from "../helpers/orders";
import { signInExisting } from "../helpers/rfq";
import { newEmail, ownIp } from "../helpers/sign-in";

// QC screens (founder QC, 17 Nov 2026): a picture of every supplier, buyer and member page at 1440 and 390, on CI's
// throwaway database with sample content, for the founder to review in one place instead of clicking through the
// live site. Not part of the test suite (playwright.qc.config.ts runs it); it fails only if a page can't be shown.

const PAGES = {
  supplier: [
    "/supplier",
    "/supplier/verification",
    "/supplier/company",
    "/supplier/storefront",
    "/supplier/products",
    "/supplier/products/new",
    "/supplier/products/quick",
    "/supplier/products/import",
    "/supplier/products/datasheet",
    "/supplier/products/categories",
    "/supplier/rfqs",
    "/supplier/messages",
    "/supplier/orders",
    "/supplier/invoices",
    "/supplier/analytics",
    "/supplier/content",
    "/supplier/team",
    "/supplier/bank",
    "/account",
    "/notifications",
  ],
  buyer: [
    "/buyer",
    "/buyer/company",
    "/buyer/lists",
    "/buyer/rfqs",
    "/rfq/new",
    "/buyer/messages",
    "/buyer/orders",
    "/buyer/payments",
    "/buyer/alerts",
    "/cart",
    "/account",
    "/notifications",
  ],
  member: [
    "/member",
    "/member/welcome",
    "/member/alerts",
    "/member/saved",
    "/member/follows",
    "/member/hydrogen-101",
    "/member/events",
    "/member/applications",
    "/member/profile",
    "/member/preferences",
    "/member/security",
    "/member/join-company",
    "/directory",
    "/account",
    "/notifications",
  ],
} as const;

const OUT = "../../qc-screens";
const slug = (path: string) => path.replace(/^\//, "").replace(/[/?=&]+/g, "_") || "home";

async function shoot(page: Page, role: keyof typeof PAGES, width: string) {
  const dir = `${OUT}/${role}/${width}`;
  mkdirSync(dir, { recursive: true });
  const broken: string[] = [];
  for (const path of PAGES[role]) {
    const res = await page.goto(path);
    // Let lists and images settle; the fixture already waited for the page to hydrate.
    await page.waitForLoadState("networkidle").catch(() => undefined);
    if (!res || res.status() >= 500) broken.push(`${path} (${String(res?.status() ?? "no answer")})`);
    await page.screenshot({ path: `${dir}/${slug(path)}.png`, fullPage: true });
  }
  return broken;
}

test.describe.configure({ mode: "parallel" });

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("supplier pages", async ({ page }, info) => {
  test.setTimeout(600_000);
  const d = await setup();
  await signInExisting(page, d.supplierEmail, "/supplier");
  expect(await shoot(page, "supplier", info.project.name)).toEqual([]);
});

test("buyer pages", async ({ page }, info) => {
  test.setTimeout(600_000);
  const d = await setup();
  await signInExisting(page, d.buyerEmail, "/buyer");
  expect(await shoot(page, "buyer", info.project.name)).toEqual([]);
});

test("member pages", async ({ page }, info) => {
  test.setTimeout(600_000);
  await signInMember(page, newEmail("qc-member"));
  expect(await shoot(page, "member", info.project.name)).toEqual([]);
});
