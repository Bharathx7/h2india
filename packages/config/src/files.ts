// Upload limits per kind of file (step 3.7, decisions A20 and A21). Configuration, shared by the upload zone in the
// browser (hint text, first check) and the server and worker (the checks that count). Safe to import anywhere.

export type FileType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/svg+xml" | "text/csv";

export interface FileKindRule {
  /** Shown in messages, for example "Work ID". */
  label: string;
  types: readonly FileType[];
  maxMb: number;
  /** Most files of this kind on one record, when the design sets one. */
  maxCount?: number;
  /** Public files (logos, product images) are served openly once checked; private ones only by signed link. */
  visibility: "private" | "public";
  /** Personal or confidential: every download is written to the audit log. */
  sensitive: boolean;
}

const DOCS = ["application/pdf", "image/jpeg", "image/png"] as const;

export const FILE_KINDS = {
  verification_document: {
    label: "Document",
    types: DOCS,
    maxMb: 10,
    visibility: "private",
    sensitive: true,
  },
  work_id: { label: "Work ID", types: DOCS, maxMb: 10, visibility: "private", sensitive: true },
  /** The authorisation letter on Claim this profile (493:784): signed by a director. Seen only by verification. */
  claim_letter: { label: "Authorisation letter", types: DOCS, maxMb: 10, visibility: "private", sensitive: true },
  quote_attachment: { label: "Attachment", types: DOCS, maxMb: 10, visibility: "private", sensitive: false },
  datasheet: { label: "Datasheet", types: ["application/pdf"], maxMb: 20, visibility: "private", sensitive: false },
  // SVG is accepted but only a PNG made from it is kept (A21).
  /** Member profile photo (545:8): "JPG or PNG, square, up to 2 MB." */
  profile_photo: {
    label: "Photo",
    types: ["image/jpeg", "image/png"],
    maxMb: 2,
    visibility: "private",
    sensitive: false,
  },
  /** Import products from a CSV (272:4427): "Up to 500 rows". Read by the worker, never served. */
  product_import: {
    label: "CSV file",
    types: ["text/csv"],
    maxMb: 5,
    visibility: "private",
    sensitive: false,
  },
  logo: {
    label: "Logo",
    types: ["image/png", "image/jpeg", "image/svg+xml"],
    maxMb: 5,
    visibility: "public",
    sensitive: false,
  },
  product_image: {
    label: "Image",
    types: ["image/jpeg", "image/png", "image/webp"],
    maxMb: 10,
    visibility: "public",
    sensitive: false,
  },
  /** Images with a press release (504:8): "JPG or PNG, up to 10 MB each, up to 5 images". */
  press_image: {
    label: "Image",
    types: ["image/jpeg", "image/png"],
    maxMb: 10,
    maxCount: 5,
    visibility: "public",
    sensitive: false,
  },
  /** Attachments to a grievance (519:8): "PDF, JPG or PNG, up to 10 MB each, up to 5 files". Personal data. */
  grievance_attachment: {
    label: "Attachment",
    types: DOCS,
    maxMb: 10,
    maxCount: 5,
    visibility: "private",
    sensitive: true,
  },
  /** Order documents (step 10.9): GST tax invoice, e-way bill, proof of delivery, photos with a reported problem. */
  order_document: { label: "Document", types: DOCS, maxMb: 10, visibility: "private", sensitive: false },
  delivery_photo: {
    label: "Photo",
    types: ["image/jpeg", "image/png"],
    maxMb: 10,
    maxCount: 5,
    visibility: "private",
    sensitive: false,
  },
} as const satisfies Record<string, FileKindRule>;

export type FileKind = keyof typeof FILE_KINDS;

export const FILE_KIND_NAMES = Object.keys(FILE_KINDS) as FileKind[];

const SHORT: Record<FileType, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/svg+xml": "SVG",
  "text/csv": "CSV",
};

const EXTENSIONS: Record<FileType, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "text/csv": [".csv"],
};

/** "PDF, JPG or PNG" */
export function typeList(kind: FileKind): string {
  const names = FILE_KINDS[kind].types.map((t) => SHORT[t]);
  return names.length === 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} or ${names.at(-1) ?? ""}`;
}

/** The accept attribute for the file input. */
export function acceptFor(kind: FileKind): string {
  return FILE_KINDS[kind].types.flatMap((t) => [t, ...EXTENSIONS[t]]).join(",");
}

/** Most files of this kind on one record (1 unless the design sets more). */
export function maxCount(kind: FileKind): number {
  const rule: FileKindRule = FILE_KINDS[kind];
  return rule.maxCount ?? 1;
}

export function maxBytes(kind: FileKind): number {
  return FILE_KINDS[kind].maxMb * 1024 * 1024;
}

export function isFileKind(value: string): value is FileKind {
  return Object.hasOwn(FILE_KINDS, value);
}

/** How long a signed download link works (playbook: minutes). */
export const DOWNLOAD_LINK_SECONDS = 300;
/** How long a signed upload link works. */
export const UPLOAD_LINK_SECONDS = 600;
/** Work ID is deleted this many days after its support request is closed (A22). */
export const WORK_ID_KEEP_DAYS = 30;

export type UploadProblem = "size" | "type" | "virus" | "unreadable" | "missing" | "count";

/** "14 MB", "1.2 MB", "300 KB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, "") : String(Math.round(mb))} MB`;
}

/** The message under the upload zone or in the File row (505:329), the same in the browser and from the server. */
export function uploadProblemMessage(kind: FileKind, problem: UploadProblem, file: { name: string; bytes?: number }) {
  const rule: FileKindRule = FILE_KINDS[kind];
  const allowed = `Use ${typeList(kind)}, up to ${String(rule.maxMb)} MB.`;
  switch (problem) {
    case "size":
      return `${file.name} is ${formatBytes(file.bytes ?? 0)}. ${allowed}`;
    case "type":
      return `${file.name} can't be used. ${allowed}`;
    case "virus":
      return `${file.name} failed our virus check and was deleted. Upload a different file.`;
    case "unreadable":
      return `We couldn't open ${file.name}. Upload it again, or try another file.`;
    case "missing":
      return `${file.name} didn't finish uploading. Try again.`;
    case "count":
      return `You can add up to ${String(rule.maxCount ?? 1)}. Remove one to add another.`;
  }
}
