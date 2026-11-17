import { expect, test, type Page } from "../fixtures";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { freshGstin } from "../helpers/join";
import { enterCode, newEmail, ownIp, requestCode, withDb } from "../helpers/sign-in";

// Admin QC (16 Nov 2026): a Super admin adds a supplier and lands on its Company detail; the owner, who has no account
// yet, opens the emailed invitation, signs in, accepts and reaches the supplier workspace.

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function invitationLink(page: Page, to: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=5`,
        );
        const list = (await res.json()) as { messages?: { ID: string }[] };
        const first = list.messages?.[0];
        if (!first) return "";
        const msg = await page.request.get(`${MAILPIT}/api/v1/message/${first.ID}`);
        link =
          /(https?:\/\/[^\s"\]]+\/invite\/[A-Za-z0-9_-]+)/.exec(((await msg.json()) as { Text: string }).Text)?.[1] ??
          "";
        return link;
      },
      { message: `an invitation to ${to}`, timeout: 15_000 },
    )
    .toContain("/invite/");
  return new URL(link).pathname;
}

test("a Super admin adds a supplier; the new owner accepts the invitation and gets the workspace", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const gstin = freshGstin();
  const owner = newEmail("qc-owner");

  const back = await backOfficeContext(browser);
  const op = await back.newPage();
  await signInOperator(op, "Super admin");
  await op.goto("/admin/users");
  await op.getByRole("link", { name: "Add a supplier" }).click();
  await expect(op.getByRole("heading", { level: 1, name: "Add a supplier" })).toBeVisible();
  await op.getByLabel("GSTIN").fill(gstin);
  await op.getByLabel("Owner's email").fill(owner);
  await op.getByRole("button", { name: "Add supplier and invite owner" }).click();
  await expect(op).toHaveURL(/\/admin\/users\/companies\/[0-9a-f-]{36}\?added=1$/);
  await expect(op.getByText("was added")).toBeVisible();
  await expect(op.getByRole("region", { name: "GSTIN", exact: true }).getByText(gstin)).toBeVisible();
  await expect(op.getByText(`${owner} · Admin`)).toBeVisible();
  // The same GSTIN again is refused, with a link to the company that has it.
  await op.goto("/admin/users/companies/new");
  await op.getByLabel("GSTIN").fill(gstin);
  await op.getByLabel("Owner's email").fill(newEmail("qc-other"));
  await op.getByRole("button", { name: "Add supplier and invite owner" }).click();
  await expect(op.getByText("This company is already on H2 Economy").first()).toBeVisible();
  await back.close();

  const path = await invitationLink(page, owner);
  await page.goto(path);
  await page.getByRole("link", { name: "Sign in to accept" }).click();
  await enterCode(page, await requestCode(page, owner));
  const accept = page.getByRole("button", { name: "Accept invitation" });
  await expect(accept).toBeVisible({ timeout: 15_000 });
  // They never went through Join, so they agree to the Terms here first.
  await accept.click();
  await expect(page.getByText("Agree to the Terms of use and Privacy policy to continue")).toBeVisible();
  await page.getByRole("checkbox", { name: /I agree to the Terms of use/ }).click();
  await accept.click();
  await expect(page).toHaveURL(/\/supplier/);
  const role = await withDb(
    async (db) =>
      (
        await db.query<{ role: string }>(
          `SELECT m.role FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.email = $1`,
          [owner],
        )
      ).rows[0]?.role,
  );
  expect(role).toBe("Admin");
});
