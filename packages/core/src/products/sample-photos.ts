import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { audit } from "../audit";
import { processFile } from "../files/files";
import { buckets, writeObject } from "../files/storage";

// Photos for the flagged sample products (founder, 20 Nov 2026: `pnpm samples:photos`). The sample suppliers have no
// people who could upload, so the photo goes through the same checks as a supplier's upload without the browser
// part: the bytes land in quarantine, processFile() scans them, checks the type and re-encodes them into the public
// bucket, and only an Available file is attached. Touches sample products only, and only ones without a photo, so
// running it again changes nothing. Real listings get photos only from their supplier (saveProduct, reviewed).

export type SamplePhotoResult = "attached" | "has a photo" | "no sample product" | `rejected: ${string}`;

export async function attachSamplePhoto(
  db: Executor,
  input: { slug: string; name: string; type: "image/jpeg" | "image/png" | "image/webp"; bytes: Uint8Array },
): Promise<SamplePhotoResult> {
  const p = schema.products;
  const [product] = await db
    .select({ id: p.id, organisationId: p.organisationId, images: p.images })
    .from(p)
    .where(and(eq(p.slug, input.slug), eq(p.sample, true), isNull(p.deletedAt)))
    .limit(1);
  if (!product) return "no sample product";
  if (product.images.length) return "has a photo";

  const f = schema.files;
  const id = uuidv7();
  await db.insert(f).values({
    id,
    kind: "product_image",
    status: "Checking",
    uploadedBy: null,
    organisationId: product.organisationId,
    name: input.name,
    declaredType: input.type,
    declaredBytes: input.bytes.length,
    quarantineKey: id,
  });
  await writeObject(buckets().quarantine, id, input.bytes, { type: input.type });
  const status = await processFile(id);
  if (status !== "Available") {
    const [row] = await db.select({ reason: f.rejectReason }).from(f).where(eq(f.id, id)).limit(1);
    return `rejected: ${row?.reason ?? status}`;
  }

  const images = [{ fileId: id }];
  await db.transaction(async (tx) => {
    await tx.update(f).set({ attachedType: "product", attachedId: product.id }).where(eq(f.id, id));
    await tx.update(p).set({ images, updatedAt: new Date() }).where(eq(p.id, product.id));
    await audit(tx, {
      actorId: null,
      action: "product.updated",
      resourceType: "product",
      resourceId: product.id,
      companyId: product.organisationId,
      before: { images: product.images },
      after: { images },
      reason: "pnpm samples:photos (photo for a sample product)",
    });
  });
  return "attached";
}

export type SamplePhotoRemoval = "removed" | "no photo" | "no sample product";

/**
 * Takes the photos off a sample product again (founder, 20 Nov 2026: `pnpm samples:photos --remove`), so it shows the
 * drawing. Sample products only; the files stay, detached, and every change is audited. Real listings are never
 * touched here.
 */
export async function removeSamplePhotos(db: Executor, slug: string): Promise<SamplePhotoRemoval> {
  const p = schema.products;
  const [product] = await db
    .select({ id: p.id, organisationId: p.organisationId, images: p.images })
    .from(p)
    .where(and(eq(p.slug, slug), eq(p.sample, true), isNull(p.deletedAt)))
    .limit(1);
  if (!product) return "no sample product";
  if (!product.images.length) return "no photo";
  const f = schema.files;
  await db.transaction(async (tx) => {
    await tx
      .update(f)
      .set({ attachedType: null, attachedId: null })
      .where(and(eq(f.attachedType, "product"), eq(f.attachedId, product.id)));
    await tx.update(p).set({ images: [], updatedAt: new Date() }).where(eq(p.id, product.id));
    await audit(tx, {
      actorId: null,
      action: "product.updated",
      resourceType: "product",
      resourceId: product.id,
      companyId: product.organisationId,
      before: { images: product.images },
      after: { images: [] },
      reason: "pnpm samples:photos --remove (photo taken off a sample product)",
    });
  });
  return "removed";
}
