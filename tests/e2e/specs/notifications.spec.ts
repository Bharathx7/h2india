import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 3.9: the bell (97:3168) and the notification centre (97:2564), with the Email settings tab.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function seed(email: string) {
  await withDb(async (db) => {
    const user = await db.query<{ id: string }>("SELECT id FROM core.users WHERE email = $1", [email]);
    const id = user.rows[0]?.id ?? "";
    const rows: [string, string, string, string, string | null, string | null, string][] = [
      [
        "quotes",
        "file-text",
        "Hydrotek Systems sent a quote for RFQ-2026-0088",
        "Compare all quotes before 20 Nov 2026",
        "/buyer/rfqs",
        "Compare quotes",
        "3 minutes",
      ],
      [
        "orders",
        "clipboard-check",
        "ORD-2026-0091 is waiting for Anjali Shah's approval",
        "₹11,80,000 is above your ₹10 lakh approval limit",
        "/buyer/orders",
        "Review order",
        "2 minutes",
      ],
      [
        "orders",
        "truck",
        "Order ORD-2026-0083 has shipped",
        "Delivery expected by 12 Nov 2026",
        "/buyer/orders",
        "Track order",
        "1 minute",
      ],
      [
        "quotes",
        "shield-check",
        "RFQ-2026-0093 was checked and sent to 5 suppliers",
        "Quotes usually arrive within 3 working days",
        null,
        null,
        "3 days",
      ],
    ];
    for (const [category, icon, title, body, href, action, ago] of rows) {
      await db.query(
        `INSERT INTO core.notifications (id, user_id, event, category, icon, title, body, href, action_label, visible_at, created_at, read_at)
         VALUES (gen_random_uuid(), $1, 'test', $2, $3, $4, $5, $6, $7, now() - $8::interval, now() - $8::interval,
                 CASE WHEN $8 = '3 days' THEN now() ELSE NULL END)`,
        [id, category, icon, title, body, href, action, ago],
      );
    }
  });
}

test("the bell shows the unread count, and Mark all read clears it", async ({ page }) => {
  const email = newEmail("bell");
  await signInNew(page, email);
  await seed(email);
  await page.goto("/notifications");
  const bell = page.getByRole("button", { name: "Notifications, 3 unread" });
  await expect(bell).toBeVisible();
  await expect(page.getByTestId("bell-count")).toHaveText("3");

  await bell.click();
  const panel = page.getByRole("dialog", { name: "Notifications" });
  await expect(panel.getByText("3 new")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Hydrotek Systems sent a quote for RFQ-2026-0088" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "See all notifications" })).toHaveAttribute("href", "/notifications");
  await panel.getByRole("button", { name: "Mark all read" }).click();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByTestId("bell-count")).toHaveCount(0);

  await expect
    .poll(() =>
      withDb(async (db) => {
        const r = await db.query<{ n: string }>(
          "SELECT count(*) AS n FROM core.notifications n JOIN core.users u ON u.id = n.user_id WHERE u.email = $1 AND n.read_at IS NULL",
          [email],
        );
        return Number(r.rows[0]?.n);
      }),
    )
    .toBe(0);
});

test("the notification centre groups, filters and links notifications", async ({ page, isMobile }) => {
  const email = newEmail("centre");
  await signInNew(page, email);
  await seed(email);
  await page.goto("/notifications");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Earlier this week" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Compare quotes" })).toHaveAttribute("href", "/buyer/rfqs");
  await expect(main.getByRole("button", { name: "Unread · 3" })).toBeVisible();
  if (!isMobile) {
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations).toEqual([]);
  }

  await main.getByRole("button", { name: "Orders" }).click();
  await expect(main.getByText("Order ORD-2026-0083 has shipped")).toBeVisible();
  await expect(main.getByText("Hydrotek Systems sent a quote for RFQ-2026-0088")).toHaveCount(0);
  await main.getByRole("button", { name: "Alerts" }).click();
  await expect(main.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await main.getByRole("button", { name: "All", exact: true }).click();
  await main.getByRole("button", { name: "Mark all as read" }).click();
  await expect(main.getByRole("button", { name: "Unread · 0" })).toBeVisible();

  await main.getByRole("tab", { name: "Email settings" }).click();
  await expect(page).toHaveURL(/tab=email/);
  const account = main.getByRole("checkbox", { name: "Account and security: Email" });
  await expect(account).toBeChecked();
  await expect(account).toBeDisabled();
  const follow = main.getByRole("checkbox", { name: "Updates from what you follow: Email" });
  await expect(follow).not.toBeChecked();
  await follow.click();
  await main.getByRole("button", { name: "Save changes" }).click();
  await expect(main.getByText("Changes saved")).toBeVisible();
  await page.reload();
  await expect(main.getByRole("checkbox", { name: "Updates from what you follow: Email" })).toBeChecked();
});

test("the notification centre's empty, loading and error states", async ({ page, isMobile }) => {
  test.skip(isMobile, "states checked once");
  await signInNew(page, newEmail("states"));
  await page.goto("/notifications");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "You're all caught up" })).toBeVisible();
  await expect(main.getByRole("button", { name: "Email settings" })).toBeVisible();
  await page.goto("/notifications?state=error");
  await expect(main.getByRole("heading", { name: "We couldn't load notifications" })).toBeVisible();
  await expect(main.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.goto("/notifications?state=loading");
  await expect(main.getByRole("region", { name: "Your notifications" })).toHaveAttribute("aria-busy", "true");
});

test("signed out, the notification centre asks you to sign in", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fnotifications|\/sign-in\?next=\/notifications/);
});

test("/dev/messages lists every template and sends a built one to you", async ({ page, isMobile }) => {
  test.skip(isMobile, "developer page checked once");
  const email = newEmail("devmsg");
  await signInNew(page, email);
  await page.goto("/dev/messages");
  await expect(page.getByRole("heading", { name: "Message templates" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(45); // header + 34 designed + 10 undrawn
  const row = page.getByRole("row", { name: /Sign-in code email sign_in_code 671:428/ });
  await row.getByRole("button", { name: "Send to me" }).click();
  await expect(row.getByRole("status")).toHaveText(`Sent to ${email}`);
  await page.goto("/notifications");
  await expect(page.getByRole("main").getByText("Test sent: Sign-in code")).toBeVisible();
});
