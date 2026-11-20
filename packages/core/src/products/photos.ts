import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { publicImage } from "../files/files";

// Product photos on the public site (CLAUDE.md design rule: a real photo always replaces the drawing). A photo counts
// only when its file is a checked product_image attached to that same product, so a file id copied onto another
// listing, a rejected upload or a removed file never shows. Product images are public files: the URLs are the
// storage domain's (S3_PUBLIC_URL), cleaned and resized by processFile() (320, 640 and 1280 px WebP copies).

export interface ProductPhoto {
  /** The largest copy, for browsers that ignore srcSet. */
  src: string;
  /** "…/w320.webp 320w, …/w640.webp 640w, …" */
  srcSet: string;
}

/** Turns a file's public URLs into an <img> source. */
export function photoOf(image: { original: string | null; sizes: Record<string, string> }): ProductPhoto | null {
  const sizes = Object.entries(image.sizes)
    .map(([w, url]) => [Number(w), url] as const)
    .filter(([w]) => Number.isInteger(w) && w > 0)
    .sort((a, b) => a[0] - b[0]);
  const src = sizes.at(-1)?.[1] ?? image.original;
  if (!src) return null;
  return { src, srcSet: sizes.map(([w, url]) => `${url} ${String(w)}w`).join(", ") };
}

/** Each product's photos, in the supplier's order. Products without a usable photo are left out of the map. */
export async function productPhotos(
  db: Executor,
  products: { id: string; images: { fileId: string }[] }[],
): Promise<Map<string, ProductPhoto[]>> {
  const ids = [...new Set(products.flatMap((p) => p.images.map((i) => i.fileId)))];
  const out = new Map<string, ProductPhoto[]>();
  if (!ids.length) return out;
  const f = schema.files;
  const rows = await db
    .select({ id: f.id, attachedId: f.attachedId, objectKey: f.objectKey, variants: f.variants })
    .from(f)
    .where(
      and(
        inArray(f.id, ids),
        eq(f.kind, "product_image"),
        eq(f.status, "Available"),
        eq(f.attachedType, "product"),
        isNull(f.deletedAt),
      ),
    );
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const p of products) {
    const photos = p.images
      .map((i) => byId.get(i.fileId))
      .filter((r): r is NonNullable<typeof r> => r !== undefined && r.attachedId === p.id)
      .map((r) => photoOf(publicImage(r)))
      .filter((x): x is ProductPhoto => x !== null);
    if (photos.length) out.set(p.id, photos);
  }
  return out;
}
