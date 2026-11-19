import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { makeCompany, useTestEnv } from "../testing/factory";
import { applyImport, saveQuickStock } from "./import";
import { saveProduct } from "./editor";

// Step 8.5 DONE WHEN: a 500-row file imports and reports per-row errors; re-importing the same file creates no
// duplicates; Quick stock and price refuses a lead time under a day.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("bulk import and quick stock", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let categoryId = "";
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava", "supplier");
    const [cat] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "components", slug: `imp-${String(Date.now())}`, label: "Valves" })
      .returning();
    categoryId = cat?.id ?? "";
    await h.db.insert(schema.catalogueAttributes).values({
      categoryId,
      key: "pressure",
      label: "Pressure",
      type: "number",
      unit: "bar",
      min: 1,
      max: 1000,
      required: true,
      displayGroup: "Performance",
    });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  async function job() {
    const [row] = await h.db
      .insert(schema.productImports)
      .values({ organisationId: a.org.id, fileId: a.org.id, fileName: "valves.csv", categoryId, createdBy: a.admin.id })
      .returning();
    return row?.id ?? "";
  }
  const file = () => {
    const lines = ["sku *,name *,pressure (bar) *,lead_time_min_weeks"];
    for (let i = 1; i <= 500; i++)
      lines.push(`V-${String(i)},Valve ${String(i)},${i === 7 ? "approx 400" : String(100 + (i % 800))},3`);
    return lines.join("\n");
  };
  const count = async () =>
    (
      await h.db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.organisationId, a.org.id), isNull(schema.products.deletedAt)))
    ).length;

  // 500 rows imported twice against a real database: on CI's shared runners this ran just over the 5 s default.
  it("imports 500 rows as drafts, reports the bad one, and re-importing changes nothing", async () => {
    const first = await job();
    expect(await applyImport(h.db, first, file())).toBe("done");
    const [done] = await h.db.select().from(schema.productImports).where(eq(schema.productImports.id, first));
    expect(done).toMatchObject({ status: "Done", rows: 500, saved: 499 });
    expect(done?.errors).toEqual([expect.objectContaining({ row: 8, sku: "V-7", column: "pressure" })]);
    expect(await count()).toBe(499);
    const statuses = await h.db
      .selectDistinct({ s: schema.products.status })
      .from(schema.products)
      .where(eq(schema.products.organisationId, a.org.id));
    expect(statuses.map((s) => s.s)).toEqual(["Draft"]);
    expect(await applyImport(h.db, await job(), file())).toBe("done");
    expect(await count()).toBe(499);
  }, 30_000);

  it("quick stock refuses a lead time under a day and saves the rest at once", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    const p = await saveProduct(h.db, actor, a.org.id, {
      data: {
        categoryId,
        name: "Leak detector",
        sku: "HLD-4",
        pricing: "fixed",
        pricePaise: 4_850_000n,
        attributes: { pressure: 10 },
      },
      submit: false,
    });
    await expect(
      saveQuickStock(h.db, actor, a.org.id, [{ id: p.id, price: "48,500", stockQty: "40", shipDays: "0" }]),
    ).rejects.toMatchObject({ errors: { [p.id]: "At least 1 day" } });
    expect(
      await saveQuickStock(h.db, actor, a.org.id, [{ id: p.id, price: "46,000", stockQty: "38", shipDays: "3" }]),
    ).toBe(1);
    const [row] = await h.db.select().from(schema.products).where(eq(schema.products.id, p.id));
    expect(row).toMatchObject({ pricePaise: 4_600_000n, stockQty: 38, shipDays: 3, stock: "in_stock" });
  });
});
