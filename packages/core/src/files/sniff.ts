import type { FileType } from "@h2india/config/files";

// The real type of a file, from its first bytes (step 3.7). The name and the browser's type are never trusted.

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const starts = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (b: Uint8Array, at: number, text: string) => {
  for (let i = 0; i < text.length; i++) if (b[at + i] !== text.charCodeAt(i)) return false;
  return true;
};

/**
 * An SVG is text whose first element is <svg>, after an optional XML declaration, comments and doctype. A linear scan,
 * not a regular expression: the text is the uploader's, and a pattern with nested repeats can be made to backtrack
 * for ever (CodeQL js/redos).
 */
export function startsWithSvg(text: string): boolean {
  let i = text.startsWith("\uFEFF") ? 1 : 0;
  const skipSpace = () => {
    while (i < text.length && /\s/.test(text.charAt(i))) i++;
  };
  const skipPast = (end: string) => {
    const at = text.indexOf(end, i);
    if (at < 0) return false;
    i = at + end.length;
    return true;
  };
  for (;;) {
    skipSpace();
    const rest = text.slice(i, i + 9);
    if (rest.startsWith("<?xml")) {
      if (!skipPast(">")) return false;
    } else if (rest.startsWith("<!--")) {
      if (!skipPast("-->")) return false;
    } else if (rest.toUpperCase().startsWith("<!DOCTYPE")) {
      if (!skipPast(">")) return false;
    } else {
      return /^<svg[\s>]/i.test(text.slice(i, i + 5));
    }
  }
}

export function sniffType(bytes: Uint8Array): FileType | null {
  if (starts(bytes, PNG)) return "image/png";
  if (starts(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "image/webp";
  // PDF readers accept the header anywhere in the first 1024 bytes.
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  if (head.includes("%PDF-")) return "application/pdf";
  const text = Buffer.from(bytes.subarray(0, 4096));
  if (!text.includes(0) && startsWithSvg(text.toString("utf8"))) return "image/svg+xml";
  // A CSV (step 8.5): UTF-8 text with no control bytes, whose first line has a comma.
  if (
    !text.includes(0) &&
    isUtf8Text(bytes.subarray(0, 4096)) &&
    /^[^\r\n]*,/.test(text.toString("utf8").replace(/^\uFEFF/, ""))
  ) {
    return "text/csv";
  }
  return null;
}

function isUtf8Text(b: Uint8Array): boolean {
  try {
    const s = new TextDecoder("utf-8", { fatal: true }).decode(b);
    // A cut-off multi-byte character at the 4 KB edge is fine; other control characters are not.
    // No control characters other than tab, line feed and carriage return.
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) return false;
    }
    return true;
  } catch {
    return b.length >= 4096;
  }
}

export const EXTENSION: Record<FileType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "text/csv": "csv",
};
