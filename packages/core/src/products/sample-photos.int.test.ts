import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeCompany, useTestEnv } from "../testing/factory";
import { productDetail } from "./detail";
import { attachSamplePhoto, removeSamplePhotos } from "./sample-photos";

// Sample product photos (20 Nov 2026): the photo goes through the file checks, then shows on the product page; a
// product without one keeps the drawing; a file id copied onto another listing never shows. Needs storage and ClamAV
// (docker compose, CI), like the files tests.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("sample product photos", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  let jpeg: Uint8Array;

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    jpeg = new Uint8Array(
      await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 40, g: 90, b: 160 } } })
        .jpeg()
        .toBuffer(),
    );
    const supplier = await makeCompany(h.db, "Photos", "supplier");
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: supplier.org.id, slug: `photos-${tag}`, tradeName: "Photo Electrolysers" });
    const [category] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "systems", slug: `photo-stacks-${tag}`, label: "Photo stacks" })
      .returning();
    const base = {
      organisationId: supplier.org.id,
      categoryId: category?.id ?? "",
      status: "Live",
      publishedAt: new Date(),
    };
    await h.db.insert(schema.products).values([
      { ...base, slug: `sample-${tag}`, name: "Sample stack", sample: true },
      { ...base, slug: `copy-${tag}`, name: "Copied stack", sample: true },
      { ...base, slug: `real-${tag}`, name: "Real stack" },
    ]);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  const attach = (slug: string) =>
    attachSamplePhoto(h.db, { slug, name: `${slug}.jpg`, type: "image/jpeg", bytes: jpeg });

  it("checks the photo, attaches it once and shows it on the product page", async () => {
    expect(await attach(`sample-${tag}`)).toBe("attached");
    const p = await productDetail(h.db, `sample-${tag}`, { includeSample: true });
    expect(p?.photos).toHaveLength(1);
    expect(p?.photos[0]?.srcSet).toContain("w320.webp 320w");

    const [row] = await h.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, `sample-${tag}`));
    const [file] = await h.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.id, row?.images[0]?.fileId ?? ""));
    expect(file).toMatchObject({ kind: "product_image", status: "Available", attachedType: "product" });
    expect(file?.attachedId).toBe(row?.id);
    const entries = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.resourceId, row?.id ?? ""), eq(auditLog.action, "product.updated")));
    expect(entries).toHaveLength(1);

    expect(await attach(`sample-${tag}`)).toBe("has a photo");
  });

  it("leaves real listings alone", async () => {
    expect(await attach(`real-${tag}`)).toBe("no sample product");
    const p = await productDetail(h.db, `real-${tag}`, { includeSample: true });
    expect(p?.photos).toEqual([]);
  });

  it("never shows a photo whose file belongs to another listing", async () => {
    const [owner] = await h.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, `sample-${tag}`));
    await h.db
      .update(schema.products)
      .set({ images: owner?.images ?? [] })
      .where(eq(schema.products.slug, `copy-${tag}`));
    const p = await productDetail(h.db, `copy-${tag}`, { includeSample: true });
    expect(p?.photos).toEqual([]);
  });

  it("takes a sample product's photo off again, and never touches a real listing", async () => {
    expect(await removeSamplePhotos(h.db, `sample-${tag}`)).toBe("removed");
    const p = await productDetail(h.db, `sample-${tag}`, { includeSample: true });
    expect(p?.photos).toEqual([]);
    expect(await removeSamplePhotos(h.db, `sample-${tag}`)).toBe("no photo");
    expect(await removeSamplePhotos(h.db, `real-${tag}`)).toBe("no sample product");
  });
});
