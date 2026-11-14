import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { compareProducts } from "../products/compare";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { brandDetail, listBrands, recordDealerEvidence } from "./index";

// Step 6.5 DONE WHEN: a compare of three products shows aligned rows and no price; a brand with no authorised dealer
// shows the designed state; the authorised-dealer badge shows only once an operator has recorded the evidence.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("brands and compare", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  let dealerId = "";
  const ids: string[] = [];
  let otherId = "";

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    const s = await makeCompany(h.db, "Brand dealer", "supplier");
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: s.org.id, slug: `dealer-${tag}`, tradeName: "Dealer Co" });
    const [brand] = await h.db
      .insert(schema.brands)
      .values({ slug: `nord-${tag}`, name: `Nord ${tag}`, origin: "Germany" })
      .returning();
    await h.db.insert(schema.brands).values({ slug: `lonely-${tag}`, name: `Lonely ${tag}`, origin: "Norway" });
    const [dealer] = await h.db
      .insert(schema.brandDealers)
      .values({ brandId: brand?.id ?? "", organisationId: s.org.id, letterValidUntil: "2030-12-31" })
      .returning();
    dealerId = dealer?.id ?? "";
    const [cat] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "components", slug: `stacks-${tag}`, label: "Stacks" })
      .returning();
    const [other] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "components", slug: `valves-${tag}`, label: "Valves" })
      .returning();
    await h.db.insert(schema.catalogueAttributes).values({
      categoryId: cat?.id ?? "",
      key: "power",
      label: "Rated power",
      type: "number",
      unit: "kW",
      comparable: true,
      displayGroup: "Performance",
    });
    for (const [i, power] of [50, 100, 100].entries()) {
      const [p] = await h.db
        .insert(schema.products)
        .values({
          organisationId: s.org.id,
          categoryId: cat?.id ?? "",
          slug: `stack-${String(i)}-${tag}`,
          name: `Stack ${String(i)}`,
          attributes: { power },
          status: "Live",
          brandId: brand?.id,
          ...(i === 2 ? { pricing: "fixed", pricePaise: 99900000n, priceCurrency: "INR" } : {}),
        })
        .returning();
      ids.push(p?.id ?? "");
    }
    const [v] = await h.db
      .insert(schema.products)
      .values({
        organisationId: s.org.id,
        categoryId: other?.id ?? "",
        slug: `valve-${tag}`,
        name: "Valve",
        status: "Live",
      })
      .returning();
    otherId = v?.id ?? "";
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("compares three products of one category with aligned rows and no price", async () => {
    const r = await compareProducts(h.db, ids, { includeSample: false, transactions: false });
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.columns.map((c) => c.name)).toEqual(["Stack 0", "Stack 1", "Stack 2"]);
    const power = r.groups.find((g) => g.group === "Performance")?.rows[0];
    expect(power).toEqual({ label: "Rated power", values: ["50 kW", "100 kW", "100 kW"], differs: true });
    for (const g of r.groups) for (const row of g.rows) expect(row.values).toHaveLength(3);
    expect(r.groups.find((g) => g.group === "Supply")?.rows.find((x) => x.label === "How to buy")?.values).toEqual([
      "Quote only",
      "Quote only",
      "Quote only",
    ]);
    expect(JSON.stringify(r)).not.toMatch(/999000|₹|paise|price/i);
  });

  it("gives guidance instead of a table for different categories", async () => {
    const r = await compareProducts(h.db, [ids[0] ?? "", otherId], { includeSample: false, transactions: false });
    expect(r.kind).toBe("mixed");
  });

  it("shows a dealer as Verified only after an operator records the letter", async () => {
    const before = await brandDetail(h.db, `nord-${tag}`, { includeSample: false });
    expect(before?.dealers).toMatchObject([{ name: "Dealer Co", verified: false }]);
    const editorUser = await makeUser(h.db, "Content person");
    const verifierUser = await makeUser(h.db, "Verifier");
    for (const [userId, role] of [
      [editorUser.id, "Content editor"],
      [verifierUser.id, "Supplier verifier"],
    ] as const) {
      const [r] = await h.db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
      await h.db.insert(schema.operatorRoles).values({ userId, roleId: r?.id ?? "" });
    }
    await expect(
      recordDealerEvidence(h.db, await loadActor(h.db, editorUser.id), { dealerId, validUntil: "2030-12-31" }),
    ).rejects.toThrow("Not allowed");
    await recordDealerEvidence(h.db, await loadActor(h.db, verifierUser.id), { dealerId, validUntil: "2030-12-31" });
    const after = await brandDetail(h.db, `nord-${tag}`, { includeSample: false });
    expect(after?.dealers[0]?.verified).toBe(true);
    // A letter that has run out shows no badge.
    await recordDealerEvidence(h.db, await loadActor(h.db, verifierUser.id), { dealerId, validUntil: "2020-01-01" });
    expect((await brandDetail(h.db, `nord-${tag}`, { includeSample: false }))?.dealers[0]?.verified).toBe(false);
  });

  it("lists brands with their filters, and a brand with no dealer has none", async () => {
    const all = await listBrands(h.db, { includeSample: false, q: tag });
    expect(all.brands.map((b) => b.name).sort()).toEqual([`Lonely ${tag}`, `Nord ${tag}`]);
    expect(
      (await listBrands(h.db, { includeSample: false, q: tag, origin: "Norway" })).brands.map((b) => b.name),
    ).toEqual([`Lonely ${tag}`]);
    expect((await brandDetail(h.db, `lonely-${tag}`, { includeSample: false }))?.dealers).toEqual([]);
  });
});
