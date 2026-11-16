import { CONSENT_COOKIE, writeConsent } from "../../../packages/core/src/consent/cookies";
import { expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import pg from "pg";
import { hydrated } from "../fixtures";

// Helpers for the sign-in flows (step 3.2). Codes are read from Mailpit, as a person would read their inbox.
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** Each test gets its own client IP (the app reads X-Forwarded-For locally and in CI), so per-IP limits stay apart. */
export async function ownIp(context: BrowserContext, info: TestInfo): Promise<void> {
  const n = (info.workerIndex * 97 + info.parallelIndex * 31 + info.repeatEachIndex * 7 + info.retry) % 250;
  const salt = Math.floor(Math.random() * 250);
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${String(salt)}.${String(n)}.${String(Date.now() % 250)}`,
  });
  // A returning visitor who already chose "Reject optional", so the cookie banner (step 5.9) doesn't cover the page.
  // consent.spec.ts tests the banner itself in a fresh context.
  const base = info.project.use.baseURL ?? "http://localhost:3000";
  await context.addCookies([
    { name: CONSENT_COOKIE, value: writeConsent({ analytics: false, browserId: "e2etestbrowser" }), url: base },
  ]);
}

export function newEmail(prefix: string): string {
  return `${prefix}-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@example.com`;
}

interface MailpitList {
  messages?: { ID: string; Subject: string; Created: string }[];
}

/** The newest sign-in code sent to this address, sent at or after `after` and not equal to `previous`. */
export async function latestCode(
  page: Page,
  email: string,
  after = 0,
  previous?: string,
  purpose: "sign-in" | "verification" | "any" = "any",
): Promise<string> {
  const subject =
    purpose === "any"
      ? /^(\d{6}) is your H2 Economy (?:sign-in|verification) code$/
      : new RegExp(`^(\\d{6}) is your H2 Economy ${purpose} code$`);
  let found = "";
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=5`,
        );
        const list = (await res.json()) as MailpitList;
        const fresh = (list.messages ?? []).filter((m) => new Date(m.Created).getTime() >= after);
        const match = fresh.find((m) => subject.test(m.Subject));
        found = subject.exec(match?.Subject ?? "")?.[1] ?? "";
        return found === previous ? "" : found;
      },
      { message: `a sign-in code email for ${email}`, timeout: 10_000 },
    )
    .toMatch(/^\d{6}$/);
  return found;
}

export async function emailCount(page: Page, email: string): Promise<number> {
  const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=50`);
  return ((await res.json()) as MailpitList).messages?.length ?? 0;
}

/** Runs SQL against the app's database. Tests that need it skip when DATABASE_URL is not set. */
/** An account for this email, as Join's confirm link makes it (email confirmed, not joined yet). Kept if it exists. */
export async function ensureAccount(email: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await withDb((db) =>
    db.query(
      `INSERT INTO core.users (id, email, name, email_verified) VALUES (gen_random_uuid(), $1, '', true) ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase()],
    ),
  );
}

export async function withDb<T>(run: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return await run(db);
  } finally {
    await db.end();
  }
}

/** Chrome's virtual authenticator: a device with a fingerprint reader, so passkeys work without hardware. */
export async function addAuthenticator(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

/** Sign in page: enter the email and ask for a code. Returns the code from the email. */
export async function requestCode(page: Page, email: string, opts: { account?: boolean } = {}): Promise<string> {
  // Signing in never creates an account (public QC 2, 16 Nov 2026): a test's new person gets one first, as Join's
  // confirm link would make it (no profile yet, so sign-in still leads to Join). `account: false` keeps the email new.
  if (opts.account !== false) await ensureAccount(email);
  // Often reached by a link click (a full page load), not page.goto: wait until the form's handlers are attached.
  await hydrated(page);
  const sentAfter = Date.now() - 1000;
  await page.getByLabel(/^(Work )?email$/i).fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  return latestCode(page, email, sentAfter);
}

/** Types a code into the six boxes (pasting into the first box fills them all and submits). */
export async function enterCode(page: Page, code: string): Promise<void> {
  await page.getByRole("textbox", { name: "Digit 1 of 6" }).fill(code);
}
