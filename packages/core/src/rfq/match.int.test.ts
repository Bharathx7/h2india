import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeCompany, useTestEnv } from "../testing/factory";
import { matchSuppliers } from "./match";

// Step 9.3 WATCH OUT: the supplier picker never offers unverified suppliers.
const url = process.env.TEST_DATABASE_URL;
const tag = randomBytes(3).toString("hex");

describe.skipIf(!url)("supplier matching", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 2 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("offers only verified suppliers that list the category, with reasons", async () => {
    const [category] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "equipment", slug: `match-${tag}`, label: "Diaphragm compressors" })
      .returning();
    const make = async (label: string, verified: boolean, state: string) => {
      const c = await makeCompany(h.db, `${label} ${tag}`, "supplier");
      await h.db
        .update(schema.organisations)
        .set({ verification: verified ? "Verified" : "GST verified", state })
        .where(eq(schema.organisations.id, c.org.id));
      await h.db
        .insert(schema.companyProfiles)
        .values({ organisationId: c.org.id, slug: `${label}-${tag}`, tradeName: label });
      await h.db.insert(schema.products).values({
        organisationId: c.org.id,
        categoryId: category?.id ?? "",
        status: "Live",
        publishedAt: new Date(),
        slug: `${label}-p-${tag}`,
        name: `${label} compressor`,
      });
      return c.org.id;
    };
    const konkan = await make("Konkan", true, "Gujarat");
    const unverified = await make("Unverified", false, "Gujarat");
    const list = await matchSuppliers(h.db, { categoryId: category?.id ?? "", state: "Gujarat", includeSample: false });
    expect(list.map((x) => x.organisationId)).toEqual([konkan]);
    expect(list[0]?.reasons).toEqual(["Lists diaphragm compressors", "Same state as site"]);
    expect(list.some((x) => x.organisationId === unverified)).toBe(false);
  });
});
