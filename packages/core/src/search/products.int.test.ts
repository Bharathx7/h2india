import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { renameCategory, setCategoryHidden } from "../catalogue/taxonomy";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { productSearchDocuments } from "./products";

// A142 (Doc 2 AC-SR-2): live products reach search through the outbox, never with a price; hiding a category takes its
// products out. A146: a category's intro is edited with its name, audited.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("products in search", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  let categoryId = "";
  const ids: string[] = [];

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    const s = await makeCompany(h.db, "Search supplier", "supplier");
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: s.org.id, slug: `search-${tag}`, tradeName: "Search Co" });
    const [cat] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "equipment", slug: `pumps-${tag}`, label: "Pumps" })
      .returning();
    categoryId = cat?.id ?? "";
    for (const [name, extra] of [
      ["Live pump", {}],
      ["Fixed pump", { pricing: "fixed", pricePaise: 4850000n, priceCurrency: "INR" }],
      ["Draft pump", { status: "Draft" }],
      ["Sample pump", { sample: true }],
    ] as const) {
      const [p] = await h.db
        .insert(schema.products)
        .values({
          organisationId: s.org.id,
          categoryId,
          slug: `${name.replace(/\s/g, "-")}-${tag}`.toLowerCase(),
          name,
          status: "Live",
          attributes: { flow: 10 },
          ...extra,
        })
        .returning();
      ids.push(p?.id ?? "");
    }
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("indexes live, non-sample products without a price", async () => {
    const docs = await productSearchDocuments(h.db, { includeSample: false, ids });
    expect(docs.map((d) => d.title).sort()).toEqual(["Fixed pump", "Live pump"]);
    expect(docs[0]).toMatchObject({
      class: "equipment",
      category: "Pumps",
      supplierName: "Search Co",
      attributes: { flow: 10 },
    });
    expect(JSON.stringify(docs)).not.toMatch(/price|paise|4850000|₹/i);
  });

  it("queues the category's products when it is hidden, and leaves them out of search", async () => {
    const u = await makeUser(h.db, "Search moderator");
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Catalogue moderator")));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    const actor = await loadActor(h.db, u.id);
    await setCategoryHidden(h.db, actor, categoryId, true);
    const queued = await h.db.select().from(schema.searchOutbox).where(eq(schema.searchOutbox.indexUid, "products"));
    expect(queued.map((q) => q.recordId)).toEqual(expect.arrayContaining([ids[0]]));
    expect(await productSearchDocuments(h.db, { includeSample: false, ids })).toEqual([]);
    await setCategoryHidden(h.db, actor, categoryId, false);

    expect(await renameCategory(h.db, actor, categoryId, "Pumps", { description: "x".repeat(601) })).toMatchObject({
      ok: false,
    });
    expect(
      await renameCategory(h.db, actor, categoryId, "Pumps", { description: "Pumps for hydrogen service." }),
    ).toEqual({ ok: true, value: null });
    const [row] = await h.db
      .select()
      .from(schema.catalogueCategories)
      .where(eq(schema.catalogueCategories.id, categoryId));
    expect(row?.description).toBe("Pumps for hydrogen service.");
  });
});
