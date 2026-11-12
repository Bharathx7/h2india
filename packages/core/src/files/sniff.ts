import type { FileType } from "@h2india/config/files";

// The real type of a file, from its first bytes (step 3.7). The name and the browser's type are never trusted.

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const starts = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (b: Uint8Array, at: number, text: string) => {
  for (let i = 0; i < text.length; i++) if (b[at + i] !== text.charCodeAt(i)) return false;
  return true;
};

// An SVG is text whose first element is <svg>, after an optional XML declaration, comments and doctype.
const SVG_START =
  /^\uFEFF?\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i;

export function sniffType(bytes: Uint8Array): FileType | null {
  if (starts(bytes, PNG)) return "image/png";
  if (starts(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "image/webp";
  // PDF readers accept the header anywhere in the first 1024 bytes.
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  if (head.includes("%PDF-")) return "application/pdf";
  const text = Buffer.from(bytes.subarray(0, 4096));
  if (!text.includes(0) && SVG_START.test(text.toString("utf8"))) return "image/svg+xml";
  return null;
}

export const EXTENSION: Record<FileType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
