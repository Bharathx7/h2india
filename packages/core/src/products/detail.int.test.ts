import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { askQuestion, productDetail, reportListing } from "./detail";

// Step 6.4 DONE WHEN: both product types show what their frames show; the price rule holds; Ask a question and
// Report this listing reach the right place.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("product page", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  let supplierId = "";

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    const supplier = await makeCompany(h.db, "Detail", "supplier");
    supplierId = supplier.org.id;
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: supplier.org.id, slug: `detail-${tag}`, tradeName: "Pranava H2" });
    const [category] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "equipment", slug: `detectors-${tag}`, label: "Detectors" })
      .returning();
    await h.db.insert(schema.catalogueAttributes).values({
      categoryId: category?.id ?? "",
      key: "range",
      label: "Measuring range",
      type: "number",
      unit: "% LEL",
      displayGroup: "Performance",
      testCondition: "In air",
    });
    const base = {
      organisationId: supplier.org.id,
      categoryId: category?.id ?? "",
      status: "Live",
      publishedAt: new Date(),
    };
    await h.db.insert(schema.products).values([
      { ...base, slug: `quote-${tag}`, name: "Quote detector", attributes: { range: 100 } },
      {
        ...base,
        slug: `fixed-${tag}`,
        name: "Fixed detector",
        attributes: { range: 4 },
        attributeNotes: { range: "0 to 4% by volume" },
        pricing: "fixed",
        pricePaise: 4850000n,
        priceCurrency: "INR",
        gstRateBps: 1800,
        minOrder: 2,
      },
      { ...base, slug: `draft-${tag}`, name: "Draft detector", status: "Draft" },
      {
        ...base,
        slug: `indicative-${tag}`,
        name: "Indicative system",
        pricing: "indicative",
        priceCurrency: "INR",
        indicativeMinPaise: 400000000n,
        indicativeMaxPaise: 550000000n,
      },
    ]);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("shows no price for a quote-only product", async () => {
    const p = await productDetail(h.db, `quote-${tag}`, { includeSample: false });
    expect(p).toMatchObject({ pricing: "quote", price: null, name: "Quote detector" });
    expect(p?.specs).toEqual([
      { group: "Performance", rows: [{ label: "Measuring range", value: "100", unit: "% LEL", condition: "In air" }] },
    ]);
  });

  it("shows a fixed price with the supplier's GST rate, and the product's own test condition", async () => {
    const p = await productDetail(h.db, `fixed-${tag}`, { includeSample: false });
    expect(p?.price).toEqual({
      amount: "₹48,500",
      gst: "GST 18%: ₹8,730",
      total: "₹57,230 incl. GST per unit",
    });
    expect(p?.minOrder).toBe(2);
    expect(p?.specs[0]?.rows[0]?.condition).toBe("0 to 4% by volume");
  });

  it("shows a supplier's indicative range on the product page, and the database keeps ranges sane (A141)", async () => {
    const p = await productDetail(h.db, `indicative-${tag}`, { includeSample: false });
    expect(p).toMatchObject({ pricing: "indicative", price: null, indicative: "₹40,00,000 – ₹55,00,000" });
    const [anyProduct] = await h.db.select().from(schema.products).limit(1);
    const bad = (extra: Record<string, unknown>) =>
      h.db.insert(schema.products).values({
        organisationId: anyProduct?.organisationId ?? "",
        categoryId: anyProduct?.categoryId ?? "",
        slug: `bad-${randomBytes(3).toString("hex")}`,
        name: "Bad",
        ...extra,
      });
    await expect(
      bad({ pricing: "indicative", priceCurrency: "INR", indicativeMinPaise: 5n, indicativeMaxPaise: 1n }),
    ).rejects.toThrow();
    await expect(bad({ pricing: "quote", indicativeMinPaise: 5n, indicativeMaxPaise: 9n })).rejects.toThrow();
  });

  it("doesn't show drafts", async () => {
    expect(await productDetail(h.db, `draft-${tag}`, { includeSample: false })).toBeNull();
  });

  it("files a question for the supplier and a report for the listings queue", async () => {
    const asker = await makeUser(h.db, "Asker");
    expect(
      await askQuestion(h.db, { slug: `quote-${tag}`, userId: asker.id, question: "Short", companyName: null }),
    ).toEqual({
      ok: false,
      errors: { question: "Write your question in a sentence or two" },
    });
    expect(
      await askQuestion(h.db, {
        slug: `quote-${tag}`,
        userId: asker.id,
        question: "Can it run at 30% load for long periods?",
        companyName: "Greenfield Hydrogen",
      }),
    ).toEqual({ ok: true });
    const [q] = await h.db.select().from(schema.productQuestions).where(eq(schema.productQuestions.askerId, asker.id));
    expect(q).toMatchObject({ organisationId: supplierId, sharedCompany: "Greenfield Hydrogen", status: "Open" });

    expect(
      await reportListing(h.db, { slug: `quote-${tag}`, problem: "x", details: "", email: "no", userId: null }),
    ).toEqual({
      ok: false,
      errors: {
        problem: "Choose what's wrong",
        details: "Tell us what's wrong in a sentence or two",
        email: "Enter an email, like you@example.com",
      },
    });
    expect(
      await reportListing(h.db, {
        slug: `quote-${tag}`,
        problem: "misleading-certificate",
        details: "The certificate is for a different model.",
        email: "",
        userId: null,
      }),
    ).toEqual({ ok: true });
  });
});
