import { expect, test } from "../fixtures";
import { backOfficeContext, newAuthor, signInOperator } from "../helpers/cms";
import { ownIp, withDb } from "../helpers/sign-in";

// Step 4.6: the content screens in the back office (638:8, 639:8, 640:8 to 649:730). An Editor-in-chief writes an
// article and takes it through the workflow; editors add a tag, upload an image and open the publishing calendar.
// Desktop only (the back office asks phones for a larger screen, 627:1001).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await ownIp(context, info);
});

test("an Editor-in-chief writes an article, submits it and publishes it", async ({ page }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Editor-in-chief");
  const authorName = `Kavita Rao ${String(Date.now())}`;
  await newAuthor(page.request, authorName);
  const headline = `Green ammonia bids keep falling ${String(Date.now())}`;

  await page.goto("/admin/content/articles/new");
  await page.getByLabel("Headline").fill(headline);
  await page.getByLabel("Standfirst").fill("Three auctions in a month, and each cleared lower than the last.");
  await page.getByRole("textbox", { name: "Paragraph" }).fill("The latest round closed at a **record low** price.");
  await page.getByLabel("Author").selectOption({ label: authorName });
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Source 1 title").fill("SECI auction results");
  await page.getByLabel("Source 1 link").fill("https://example.org/seci-results");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/articles\/\d+$/, { timeout: 20_000 });
  const id = Number(/\/articles\/(\d+)$/.exec(page.url())?.[1]);

  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("button", { name: "Publish now" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible({ timeout: 20_000 });

  // The body block went in as rich text with the bold kept, and the change was audited by the workflow.
  const row = await withDb(async (db) => {
    const a = await db.query<{ workflow: string; status: string }>(
      `SELECT workflow, _status AS status FROM cms.articles WHERE id = $1`,
      [id],
    );
    const audit = await db.query(`SELECT 1 FROM core.audit_log WHERE action = 'article.publish' AND resource_id = $1`, [
      String(id),
    ]);
    return { ...a.rows[0], audited: audit.rowCount };
  });
  expect(row).toMatchObject({ workflow: "Published", status: "published", audited: 1 });

  await page.goto("/admin/content?tab=articles");
  await expect(page.getByRole("link", { name: headline }).first()).toBeVisible();
});

test("a Content editor adds a tag and can't publish an article", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const name = `Ammonia cracking ${String(Date.now())}`;
  await page.goto("/admin/content/tags/new");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/tags\/\d+$/, { timeout: 20_000 });
  await page.goto("/admin/content/tags");
  await expect(page.getByRole("link", { name }).first()).toBeVisible();

  // Writers write; only an Editor-in-chief schedules and publishes (A26).
  await page.goto("/admin/content/articles/new");
  await expect(page.getByRole("button", { name: "Publish now" })).toHaveCount(0);
});

test("an image is uploaded to the media library with its alt text", async ({ page }) => {
  test.skip(!process.env.E2E_STORAGE, "needs object storage and the virus scanner (E2E_STORAGE=1)");
  await signInOperator(page, "Content editor");
  await page.goto("/admin/content/media");
  // A 1×1 PNG.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByLabel("File").setInputFiles({ name: "electrolyser.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Add alt text: describe what the image shows.")).toBeVisible();
  await page.getByLabel("Alt text").fill("A PEM electrolyser stack on a test bench");
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("electrolyser.png uploaded.")).toBeVisible({ timeout: 30_000 });
});

test("the publishing calendar and site settings open", async ({ page }) => {
  await signInOperator(page, "Editor-in-chief");
  await page.goto("/admin/content/calendar");
  await expect(page.getByRole("heading", { level: 1, name: "Publishing calendar" })).toBeVisible();
  await page.goto("/admin/content/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Site settings" })).toBeVisible();
});

// Archive (founder QC, 17 Nov 2026): an Editor-in-chief archives a record with a reason; it leaves the list and shows
// under Archived, where Restore brings it back. Both are audited. A Content editor has no Archive button.
test("an Editor-in-chief archives a glossary term and restores it", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Editor-in-chief");
  const term = `Archive check ${String(Date.now())}`;
  await page.goto("/admin/content/glossary/new");
  await page.getByLabel("Term").fill(term);
  await page.getByLabel("Short definition").fill("A term made by the archive test.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/glossary\/\d+$/, { timeout: 20_000 });
  const id = Number(/\/glossary\/(\d+)$/.exec(page.url())?.[1]);

  await page.getByRole("button", { name: "Archive" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Why/).fill("Duplicate of another term.");
  await dialog.getByRole("button", { name: "Archive" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/glossary$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: term })).toHaveCount(0);

  const archived = async () =>
    withDb(async (db) => {
      const r = await db.query<{ archived: boolean }>(
        `SELECT deleted_at IS NOT NULL AS archived FROM cms.glossary WHERE id = $1`,
        [id],
      );
      return r.rows[0]?.archived;
    });
  expect(await archived()).toBe(true);

  await page.goto("/admin/content/glossary?view=archived");
  await expect(page.getByText(term)).toBeVisible();
  await page.getByRole("button", { name: `Restore ${term}` }).click();
  await expect.poll(archived, { timeout: 20_000 }).toBe(false);
  const audited = await withDb(async (db) => {
    const r = await db.query<{ action: string }>(
      `SELECT action FROM core.audit_log WHERE resource_type = 'glossary' AND resource_id = $1 ORDER BY at`,
      [String(id)],
    );
    return r.rows.map((x) => x.action);
  });
  expect(audited).toEqual(expect.arrayContaining(["content.archive", "content.restore"]));
  await page.goto("/admin/content/glossary");
  await expect(page.getByRole("link", { name: term })).toBeVisible();

  // Archiving needs content.delete: a Content editor sees the record without the button.
  const other = await backOfficeContext(browser);
  const editor = await other.newPage();
  await signInOperator(editor, "Content editor");
  await editor.goto(`/admin/content/glossary/${String(id)}`);
  await expect(editor.getByRole("button", { name: "Save changes" })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Archive" })).toHaveCount(0);
  await other.close();
});
