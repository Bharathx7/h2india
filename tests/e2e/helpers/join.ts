import { expect, type Page } from "@playwright/test";
import { enterCode, latestCode, requestCode, withDb } from "./sign-in";

// Helpers for the Join flow (step 3.3). SMS and emails are read from Mailpit (MAILPIT_URL).
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** Test GSTINs of the fake provider (packages/core/src/companies/adapters/gstin/fake.ts). */
export const GSTIN = {
  valid: "27AAKCG5521M1Z9",
  badCheck: "27AAKCG5521M1Z3",
  notFound: "27AAKCN0000N1ZK",
  cancelled: "29AABCK7731F1ZH",
  slow: "27AAKCP9999P1ZW",
  several: "27AAKCS4410N1Z1",
} as const;

interface Summary {
  ID: string;
  Subject: string;
  Created: string;
}

async function newest(page: Page, to: string, after: number): Promise<Summary | null> {
  const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=5`);
  const list = (await res.json()) as { messages?: Summary[] };
  return (list.messages ?? []).find((m) => new Date(m.Created).getTime() >= after) ?? null;
}

export function newMobile(): string {
  return `9${String(Math.floor(100_000_000 + Math.random() * 899_999_999))}`;
}

/** The 6-digit code in the newest SMS to this number. */
export async function latestSmsCode(page: Page, mobile: string, after: number): Promise<string> {
  let code = "";
  await expect
    .poll(
      async () => {
        const m = await newest(page, `sms-91${mobile}@sms.h2india.local`, after);
        if (!m) return "";
        const res = await page.request.get(`${MAILPIT}/api/v1/message/${m.ID}`);
        code = /^(\d{6}) is your H2 Economy/.exec(((await res.json()) as { Text: string }).Text)?.[1] ?? "";
        return code;
      },
      { message: `an SMS to ${mobile}`, timeout: 10_000 },
    )
    .toMatch(/^\d{6}$/);
  return code;
}

/** The link in the newest "Set your H2 Economy back-office password" message (A183). */
export async function latestPasswordLink(page: Page, email: string, after: number): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const m = await newest(page, email, after);
        if (m?.Subject !== "Set your H2 Economy back-office password") return "";
        const res = await page.request.get(`${MAILPIT}/api/v1/message/${m.ID}`);
        link =
          /(https?:\/\/[^\s"]+\/reset-password\/[^\s"\]]+)/.exec(((await res.json()) as { Text: string }).Text)?.[1] ??
          "";
        return link;
      },
      { message: `a set-password link for ${email}`, timeout: 10_000 },
    )
    .toContain("/reset-password/");
  return link;
}

/** The link in the newest "Confirm your email" message. */
export async function latestConfirmLink(page: Page, email: string, after: number): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const m = await newest(page, email, after);
        if (m?.Subject !== "Confirm your email for H2 Economy") return "";
        const res = await page.request.get(`${MAILPIT}/api/v1/message/${m.ID}`);
        link =
          /(http:\/\/[^\s"]+\/magic-link\/verify[^\s"\]]+)/.exec(((await res.json()) as { Text: string }).Text)?.[1] ??
          "";
        return link;
      },
      { message: `a confirm-email link for ${email}`, timeout: 10_000 },
    )
    .toContain("/magic-link/verify");
  return link;
}

/** Step 3: mobile code, name, role, terms. */
export async function fillDetails(page: Page, opts: { email?: string; name: string; mobile?: string }) {
  if (opts.email) await page.getByLabel("Work email").fill(opts.email);
  const mobile = opts.mobile ?? newMobile();
  await page.getByLabel("Mobile").fill(mobile);
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("button", { name: "Code sent" })).toBeVisible();
  const code = await latestSmsCode(page, mobile, sentAfter);
  await page.getByRole("textbox", { name: "Digit 1 of 6" }).fill(code);
  await expect(page.getByText("Mobile number verified")).toBeVisible();
  await page.getByLabel("Full name").fill(opts.name);
  await page.getByLabel("Your role").selectOption("Procurement or purchase");
  await page.getByRole("checkbox", { name: /I agree to the Terms of use/ }).check();
  return mobile;
}

/** Signs a brand-new person in with an email code; A1 sends them on to Join. */
export async function signInNew(page: Page, email: string): Promise<void> {
  await page.goto("/sign-in");
  await enterCode(page, await requestCode(page, email));
  await expect(page.getByRole("heading", { name: "Join H2 Economy" })).toBeVisible({ timeout: 15_000 });
}

/**
 * Makes an account a member, as finishing Join as a member does (founder QC, 17 Nov 2026: the Directory and the member
 * area are for members). `as` keeps a buyer or supplier profile and switches membership on instead.
 */
export async function makeMember(email: string, as: "member" | "buyer-member" = "member"): Promise<void> {
  await withDb((db) =>
    db.query(
      as === "member"
        ? `UPDATE core.users SET profile_type = coalesce(profile_type, 'member') WHERE email = $1`
        : `UPDATE core.users SET profile_type = coalesce(profile_type, 'buyer'), member_since = now() WHERE email = $1`,
      [email.trim().toLowerCase()],
    ),
  );
}

/** Signs a brand-new person in and makes them a member, for tests of member features. */
export async function signInMember(page: Page, email: string): Promise<void> {
  await signInNew(page, email);
  await makeMember(email);
}

/** Join steps 1 to 4 for a signed-in person creating a new buyer or supplier company. */
export async function reachCompanyStep(page: Page, kind: "Buyer company" | "Supplier company", name: string) {
  await page.getByText(kind, { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Find your company" })).toBeVisible();
  await page.getByLabel("Company name or GSTIN").fill("zz-no-such-company");
  await page.getByRole("button", { name: /Create a new company/ }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await fillDetails(page, { name });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Company details" })).toBeVisible();
}

export async function typeGstin(page: Page, gstin: string) {
  await page.getByLabel("GSTIN", { exact: true }).fill(gstin);
}

export { latestCode };

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A fresh, valid GSTIN in one of the fake provider's test families: "AAKCT" active, "AAKCP" slow portal. */
export function freshGstin(family: "AAKCT" | "AAKCP" = "AAKCT"): string {
  const letter = CHARS.charAt(10 + Math.floor(Math.random() * 26));
  const first14 = `27${family}${String(Math.floor(1000 + Math.random() * 8999))}${letter}1Z`;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14.charAt(i)) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return first14 + CHARS.charAt((36 - (sum % 36)) % 36);
}
