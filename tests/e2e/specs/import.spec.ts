import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { withDb } from "../helpers/sign-in";

// Step 4.6 DONE WHEN: a dry run changes nothing and lists every problem by row; running the same import twice creates
// no duplicates. (Companies are covered by packages/core/src/companies/import.int.test.ts; the seed by `pnpm db:seed`.)
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.skip(({ isMobile }) => isMobile, "command-line tools: once is enough");
test.describe.configure({ mode: "serial" });

const root = path.resolve(process.cwd(), "../..");
const dir = mkdtempSync(path.join(tmpdir(), "h2-import-"));
const tag = String(Date.now());

function run(type: string, file: string, apply = false): { code: number; out: string } {
  try {
    const out = execFileSync("node", ["scripts/content-import.mjs", type, file, ...(apply ? ["--apply"] : [])], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const count = (slugs: string[]) =>
  withDb(async (db) => (await db.query("SELECT 1 FROM cms.glossary WHERE slug = ANY($1)", [slugs])).rowCount ?? 0);

test("a dry run changes nothing and lists every problem by row", async () => {
  test.setTimeout(120_000);
  const file = path.join(dir, "glossary.csv");
  writeFileSync(
    file,
    [
      "slug,term,expansion,short,aliases,autoLink,publish,colour",
      `t${tag}-lcoh,LCOH${tag},Levelised cost of hydrogen,"the average cost to produce one kilogram, over a plant's life.",,yes,yes,`,
      `t${tag}-blank,Blank${tag},,,,maybe,no,`,
      `t${tag}-lcoh,Again${tag},,"A duplicate key.",,,no,`,
    ].join("\n"),
  );
  const { code, out } = run("glossary", file);
  expect(code).toBe(1);
  expect(out).toContain("Dry run (nothing changed) · glossary");
  expect(out).toMatch(/row 2 \(t\d+-lcoh\): colour: not a field of glossary/);
  expect(out).toMatch(/row 3 \(t\d+-blank\): autoLink: yes or no/);
  expect(out).toMatch(/row 4 \(t\d+-lcoh\): slug: appears twice in this file/);
  expect(out).toContain("nothing is written while any row has a problem");
  // Even --apply writes nothing while a row has a problem.
  expect(run("glossary", file, true).code).toBe(1);
  expect(await count([`t${tag}-lcoh`, `t${tag}-blank`])).toBe(0);

  // Field rules come from the CMS itself: a missing short definition is reported on its row.
  const missing = path.join(dir, "missing.csv");
  writeFileSync(missing, ["slug,term,short", `t${tag}-nodef,NoDefinition${tag},`].join("\n"));
  const checked = run("glossary", missing);
  expect(checked.out).toMatch(/row 2 \(t\d+-nodef\): short: /);
  expect(await count([`t${tag}-nodef`])).toBe(0);
});

test("running the same import twice creates no duplicates", async () => {
  test.setTimeout(120_000);
  const file = path.join(dir, "good.json");
  writeFileSync(
    file,
    JSON.stringify([
      {
        slug: `t${tag}-epc`,
        term: `EPC${tag}`,
        expansion: "Engineering, procurement and construction",
        short: "one contractor designs, buys and builds a plant.",
        publish: "yes",
      },
      {
        slug: `t${tag}-alk`,
        term: `Alkaline${tag}`,
        short: "An electrolyser with a liquid electrolyte.",
        aliases: ["AWE"],
      },
    ]),
  );
  const dry = run("glossary", file);
  expect(dry.code).toBe(0);
  expect(dry.out).toContain("2 to create");
  expect(await count([`t${tag}-epc`, `t${tag}-alk`])).toBe(0);

  const first = run("glossary", file, true);
  expect(first.code, first.out).toBe(0);
  expect(first.out).toContain("Imported · glossary: 2 to create");
  const second = run("glossary", file, true);
  expect(second.out).toContain("0 to create, 0 to update, 2 unchanged");
  expect(await count([`t${tag}-epc`, `t${tag}-alk`])).toBe(2);

  const statuses = await withDb(
    async (db) =>
      (
        await db.query<{ slug: string; _status: string }>(
          "SELECT slug, _status FROM cms.glossary WHERE slug = ANY($1) ORDER BY slug",
          [[`t${tag}-epc`, `t${tag}-alk`]],
        )
      ).rows,
  );
  // publish=yes went live; the row without it is a draft for an editor to check (A39).
  expect(statuses).toEqual([
    { slug: `t${tag}-alk`, _status: "draft" },
    { slug: `t${tag}-epc`, _status: "published" },
  ]);
});

test("articles always import as drafts", () => {
  test.setTimeout(60_000);
  const file = path.join(dir, "articles.csv");
  writeFileSync(file, ["slug,title,publish", `t${tag}-news,News ${tag},yes`].join("\n"));
  const { out } = run("articles", file);
  expect(out).toContain("publish: articles always import as drafts for the Editor-in-chief (A39)");
});
