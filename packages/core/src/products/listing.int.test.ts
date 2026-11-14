import { createDb, schema, type DbHandle } from "@h2india/db";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AttributeDef } from "../catalogue/attributes";
import { makeCompany, useTestEnv } from "../testing/factory";
import { listProducts } from "./listing";
import { parseListing } from "./rules";

// Step 6.3 DONE WHEN: selecting filters updates results and counts; the address reproduces the view; cards and the
// table never carry a price.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("category listings", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  const defs: AttributeDef[] = [
    {
      key: "rated_power",
      label: "Rated power",
      type: "number",
      unit: "kW",
      min: 1,
      max: 100000,
      options: [],
      hint: null,
      required: false,
      filterable: true,
      comparable: true,
      testCondition: null,
      displayGroup: "Performance",
      position: 1,
    },
    {
      key: "purity",
      label: "Purity",
      type: "choice",
      unit: null,
      min: null,
      max: null,
      options: ["99.99%", "99.999%"],
      hint: null,
      required: false,
      filterable: true,
      comparable: false,
      testCondition: null,
      displayGroup: "Gas quality",
      position: 2,
    },
  ];
  let scope: Parameters<typeof listProducts>[1];

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    const verified = await makeCompany(h.db, "Verified", "supplier");
    const plain = await makeCompany(h.db, "Plain", "supplier");
    await h.db
      .update(schema.organisations)
      .set({ verification: "Verified", state: "Maharashtra" })
      .where((await import("drizzle-orm")).eq(schema.organisations.id, verified.org.id));
    for (const c of [verified, plain]) {
      await h.db.insert(schema.companyProfiles).values({
        organisationId: c.org.id,
        slug: `${c.org.legalName.toLowerCase().replace(/\W+/g, "-")}-${tag}`,
        tradeName: c.org.legalName,
      });
    }
    const [parent] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "systems", slug: `elx-${tag}`, label: "Test electrolysers" })
      .returning();
    const [pem] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "systems", parentId: parent?.id, slug: "pem", label: "PEM" })
      .returning();
    const [alk] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "systems", parentId: parent?.id, slug: "alkaline", label: "Alkaline" })
      .returning();
    const product = (name: string, org: string, category: string, attributes: Record<string, unknown>, extra = {}) => ({
      organisationId: org,
      categoryId: category,
      slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${tag}`,
      name,
      attributes,
      status: "Live",
      publishedAt: new Date(),
      ...extra,
    });
    await h.db
      .insert(schema.products)
      .values([
        product(
          "PEM 1 MW",
          verified.org.id,
          pem?.id ?? "",
          { rated_power: 1000, purity: "99.999%" },
          { madeInIndia: true, leadTimeMinWeeks: 14, leadTimeMaxWeeks: 16 },
        ),
        product(
          "PEM 250 kW",
          plain.org.id,
          pem?.id ?? "",
          { rated_power: 250, purity: "99.99%" },
          { leadTimeMinWeeks: 8, leadTimeMaxWeeks: 8 },
        ),
        product(
          "Alkaline 2 MW",
          plain.org.id,
          alk?.id ?? "",
          { rated_power: 2000, purity: "99.99%" },
          { madeInIndia: true },
        ),
        product("Draft PEM", verified.org.id, pem?.id ?? "", { rated_power: 500 }, { status: "Draft" }),
        product("Sample PEM", verified.org.id, pem?.id ?? "", { rated_power: 500 }, { sample: true }),
        product(
          "Catalogue PEM 100 kW",
          verified.org.id,
          pem?.id ?? "",
          { rated_power: 100 },
          { pricing: "fixed", pricePaise: 125000000n, priceCurrency: "INR" },
        ),
      ]);
    scope = {
      categories: [
        { id: parent?.id ?? "", slug: `elx-${tag}`, label: "Test electrolysers", parentId: null },
        { id: pem?.id ?? "", slug: "pem", label: "PEM", parentId: parent?.id ?? "" },
        { id: alk?.id ?? "", slug: "alkaline", label: "Alkaline", parentId: parent?.id ?? "" },
      ],
      defs,
      includeSample: false,
    };
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("lists only live, non-sample products, with counts per filter value", async () => {
    const r = await listProducts(h.db, scope, parseListing({}, defs));
    expect(r.items.map((p) => p.name).sort()).toEqual([
      "Alkaline 2 MW",
      "Catalogue PEM 100 kW",
      "PEM 1 MW",
      "PEM 250 kW",
    ]);
    expect(r.facets.sub).toEqual([
      { slug: "pem", label: "PEM", count: 3 },
      { slug: "alkaline", label: "Alkaline", count: 1 },
    ]);
    expect(r.facets.choices.purity).toEqual([
      { value: "99.99%", count: 2 },
      { value: "99.999%", count: 1 },
    ]);
    expect(r.facets.verified).toBe(2);
  });

  it("filters by sub-category, range, choice, supplier and lead time, and counts ignore their own group", async () => {
    const q = parseListing({ sub: "pem", "min.rated_power": "200", verified: "1" }, defs);
    const r = await listProducts(h.db, scope, q);
    expect(r.items.map((p) => p.name)).toEqual(["PEM 1 MW"]);
    // The Technology counts still show Alkaline, as if only the other filters applied.
    expect(r.facets.sub.find((s) => s.slug === "pem")?.count).toBe(1);
    const lead = await listProducts(h.db, scope, parseListing({ lead: "8" }, defs));
    expect(lead.items.map((p) => p.name)).toEqual(["PEM 250 kW"]);
    const none = await listProducts(
      h.db,
      scope,
      parseListing({ "a.purity": "99.999%", "max.rated_power": "500" }, defs),
    );
    expect(none.total).toBe(0);
  });

  it("never carries a price on a card, even for a fixed-price product", async () => {
    const r = await listProducts(h.db, scope, parseListing({ view: "table" }, defs));
    expect(JSON.stringify(r)).not.toMatch(/price|paise|125000000|12,50,000/i);
  });

  it("refuses a price on a quote-only product in the database itself", async () => {
    await expect(
      h.db.insert(schema.products).values({
        organisationId: (await h.db.select().from(schema.organisations).limit(1))[0]?.id ?? "",
        categoryId: scope.categories[1]?.id ?? "",
        slug: `quote-with-price-${tag}`,
        name: "Quote with price",
        pricing: "quote",
        pricePaise: 100n,
        priceCurrency: "INR",
      }),
    ).rejects.toThrow();
  });
});
