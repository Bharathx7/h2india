import type { FileType } from "@h2india/config/files";
import sharp from "sharp";

// Images are re-encoded (step 3.7): that drops EXIF and GPS data and anything hidden after the picture, and an SVG
// becomes a PNG (A21). Smaller copies are made for lists and cards.

export const IMAGE_WIDTHS = [320, 640, 1280] as const;
const MAX_SIDE = 4000;

let configured = false;
function lib() {
  if (!configured) {
    // Only the decoders we accept may run, as Next's own image optimiser does.
    sharp.block({ operation: ["VipsForeignLoad"] });
    sharp.unblock({
      operation: ["VipsForeignLoadJpeg", "VipsForeignLoadPng", "VipsForeignLoadWebp", "VipsForeignLoadSvg"],
    });
    configured = true;
  }
  return sharp;
}

export interface CleanImage {
  body: Uint8Array;
  type: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  variants: { width: number; body: Uint8Array }[];
}

export async function cleanImage(bytes: Uint8Array, type: FileType): Promise<CleanImage> {
  const s = lib();
  const input = () =>
    s(bytes, { limitInputPixels: 40_000_000, density: type === "image/svg+xml" ? 288 : undefined, failOn: "error" })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
  const out: CleanImage["type"] =
    type === "image/jpeg" ? "image/jpeg" : type === "image/webp" ? "image/webp" : "image/png";
  const encoded =
    out === "image/jpeg"
      ? input().jpeg({ quality: 85, mozjpeg: true })
      : out === "image/webp"
        ? input().webp({ quality: 85 })
        : input().png({ compressionLevel: 9 });
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  const variants = await Promise.all(
    IMAGE_WIDTHS.filter((w) => w < info.width).map(async (width) => ({
      width,
      body: new Uint8Array(await s(data).resize({ width }).webp({ quality: 80 }).toBuffer()),
    })),
  );
  return { body: new Uint8Array(data), type: out, width: info.width, height: info.height, variants };
}
