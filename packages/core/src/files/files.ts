import { FILE_KINDS, isFileKind, maxBytes, type FileKind, type FileType } from "@h2india/config/files";
import {
  DOWNLOAD_LINK_SECONDS,
  UPLOAD_LINK_SECONDS,
  uploadProblemMessage,
  type UploadProblem,
} from "@h2india/config/files";
import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { uuidv7 } from "uuidv7";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { hashToken } from "../companies/drafts";
import { getDb } from "../db";
import { hitThrottle } from "../sign-in/throttle";
import { scanBytes } from "./clamav";
import { cleanImage } from "./images";
import { READ_RULES, UPLOAD_RULES } from "./rules";
import { EXTENSION, sniffType } from "./sniff";
import {
  buckets,
  headObject,
  publicUrl,
  readObject,
  removeObject,
  signDownload,
  signUpload,
  writeObject,
} from "./storage";

// Files (step 3.7): signed upload to quarantine → the worker checks size, scans for viruses, checks the type by
// content, cleans images → the file moves to the private or public bucket and becomes Available. Only Available files
// can be opened, and only through a short-lived signed link after the permission check.

const { files: f } = schema;
type FileRow = typeof f.$inferSelect;

export type FileStatus = "Uploading" | "Checking" | "Available" | "Rejected" | "Abandoned" | "Deleted";

export class FileError extends Error {
  constructor(
    readonly code: "NOT_ALLOWED" | "NOT_FOUND" | "TOO_MANY" | "INVALID" | UploadProblem,
    message: string,
  ) {
    super(message);
  }
}

/** Signed-out uploads per IP address per hour; signed-in uploads per person per hour. */
export const UPLOAD_LIMITS = { perIpHour: 20, perUserHour: 300 } as const;

function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  let clean = "";
  for (const c of base) {
    const code = c.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) clean += c;
  }
  clean = clean.trim().slice(-200);
  return clean || "file";
}

export interface StartUpload {
  actor: Actor;
  kind: string;
  name: string;
  type: string;
  bytes: number;
  organisationId?: string | null;
  ip?: string;
}

export interface StartedUpload {
  id: string;
  uploadUrl: string;
  /** For a signed-out uploader only: proof needed to finish, check and attach the file. Shown once. */
  key?: string;
  /** The PUT must send exactly this Content-Type. */
  type: string;
}

export async function startUpload(input: StartUpload): Promise<StartedUpload> {
  if (!isFileKind(input.kind)) throw new FileError("INVALID", "Unknown kind of file");
  const kind = input.kind;
  const name = cleanName(input.name);
  const rule = UPLOAD_RULES[kind];
  const orgId = input.organisationId ?? null;
  if (rule.who === "not-yet") throw new FileError("NOT_ALLOWED", `Uploads of this kind arrive with the ${rule.until}`);
  if (rule.who !== "anyone" && !input.actor.userId) throw new FileError("NOT_ALLOWED", "Sign in to upload");
  if (
    rule.who === "company" &&
    !(orgId && rule.permission.some((p) => can(input.actor, p, { organisationId: orgId })))
  ) {
    throw new FileError("NOT_ALLOWED", "You can't upload this for that company");
  }
  if (rule.who !== "company" && orgId && !can(input.actor, "company.manage", { organisationId: orgId })) {
    throw new FileError("NOT_ALLOWED", "You can't upload this for that company");
  }
  if (!(FILE_KINDS[kind].types as readonly string[]).includes(input.type)) {
    throw new FileError("type", uploadProblemMessage(kind, "type", { name }));
  }
  if (!Number.isInteger(input.bytes) || input.bytes <= 0) throw new FileError("INVALID", "The file is empty");
  if (input.bytes > maxBytes(kind)) {
    throw new FileError("size", uploadProblemMessage(kind, "size", { name, bytes: input.bytes }));
  }

  const db = getDb();
  const limit = input.actor.userId
    ? await hitThrottle(db, `upload-user:${input.actor.userId}`, 3600).then((s) => s.count > UPLOAD_LIMITS.perUserHour)
    : await hitThrottle(db, `upload-ip:${input.ip ?? "unknown"}`, 3600).then((s) => s.count > UPLOAD_LIMITS.perIpHour);
  if (limit) throw new FileError("TOO_MANY", "Too many uploads. Try again in an hour.");

  const id = uuidv7();
  const key = input.actor.userId ? undefined : randomBytes(24).toString("base64url");
  await db.insert(f).values({
    id,
    kind,
    uploadedBy: input.actor.userId,
    organisationId: orgId,
    uploadKeyHash: key ? hashToken(key) : null,
    name,
    declaredType: input.type,
    declaredBytes: input.bytes,
    quarantineKey: id,
  });
  const uploadUrl = await signUpload(id, input.type, input.bytes, UPLOAD_LINK_SECONDS);
  return { id, uploadUrl, key, type: input.type };
}

function isUploader(file: FileRow, actor: Actor, key?: string): boolean {
  if (file.uploadedBy && actor.userId === file.uploadedBy) return true;
  return Boolean(key && file.uploadKeyHash && hashToken(key) === file.uploadKeyHash);
}

function canRead(file: FileRow, actor: Actor, key?: string): boolean {
  if (isUploader(file, actor, key)) return true;
  const rule = READ_RULES[file.kind as FileKind] as (typeof READ_RULES)[FileKind] | undefined;
  if (!rule) return false;
  if (rule.company && file.organisationId && can(actor, rule.company, { organisationId: file.organisationId })) {
    return true;
  }
  return Boolean(rule.operator && can(actor, rule.operator));
}

/** A document of a live product's page (step 6.4): readable by anyone, only while the product is live. */
async function onLiveProduct(file: FileRow): Promise<boolean> {
  const rule = READ_RULES[file.kind as FileKind] as (typeof READ_RULES)[FileKind] | undefined;
  if (!rule?.listedOnLiveProduct || file.attachedType !== "product" || !file.attachedId) return false;
  const p = schema.products;
  const [row] = await getDb()
    .select({ id: p.id })
    .from(p)
    .where(and(eq(p.id, file.attachedId), eq(p.status, "Live"), isNull(p.deletedAt)))
    .limit(1);
  return Boolean(row);
}

async function load(id: string): Promise<FileRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new FileError("NOT_FOUND", "No such file");
  const [row] = await getDb().select().from(f).where(eq(f.id, id));
  if (!row) throw new FileError("NOT_FOUND", "No such file");
  return row;
}

export interface FileView {
  id: string;
  kind: string;
  status: FileStatus;
  name: string;
  bytes: number;
  type: string;
  /** Why it was refused, in words for the File row. */
  problem?: string;
}

function view(file: FileRow): FileView {
  return {
    id: file.id,
    kind: file.kind,
    status: file.status as FileStatus,
    name: file.name,
    bytes: file.bytes ?? file.declaredBytes,
    type: file.detectedType ?? file.declaredType,
    problem:
      file.status === "Rejected" && file.rejectReason
        ? uploadProblemMessage(file.kind as FileKind, file.rejectReason as UploadProblem, {
            name: file.name,
            bytes: file.bytes ?? file.declaredBytes,
          })
        : undefined,
  };
}

async function reject(file: FileRow, reason: UploadProblem, extra: { bytes?: number; threat?: string } = {}) {
  await removeObject(buckets().quarantine, file.quarantineKey).catch(() => undefined);
  await getDb()
    .update(f)
    .set({
      status: "Rejected",
      rejectReason: reason,
      threat: extra.threat ?? null,
      bytes: extra.bytes ?? null,
      checkedAt: new Date(),
    })
    .where(eq(f.id, file.id));
  if (reason === "virus") {
    await audit(getDb(), {
      actorId: file.uploadedBy,
      action: "file.virus_found",
      resourceType: "file",
      resourceId: file.id,
      companyId: file.organisationId,
      after: { kind: file.kind, threat: extra.threat ?? null },
    });
  }
}

/** Called by the browser after its PUT finished. Queues the checks; returns the file's state. */
export async function completeUpload(
  input: { actor: Actor; fileId: string; key?: string },
  enqueue: (fileId: string) => Promise<void>,
): Promise<FileView> {
  const file = await load(input.fileId);
  if (!isUploader(file, input.actor, input.key)) throw new FileError("NOT_FOUND", "No such file");
  if (file.status !== "Uploading") return view(file);
  const head = await headObject(buckets().quarantine, file.quarantineKey);
  if (!head)
    throw new FileError("missing", uploadProblemMessage(file.kind as FileKind, "missing", { name: file.name }));
  if (head.bytes > maxBytes(file.kind as FileKind)) {
    await reject(file, "size", { bytes: head.bytes });
  } else {
    await getDb()
      .update(f)
      .set({ status: "Checking" })
      .where(and(eq(f.id, file.id), eq(f.status, "Uploading")));
    await enqueue(file.id);
  }
  return view(await load(file.id));
}

/** The File row polls this while the worker checks the file. */
export async function fileStatus(input: { actor: Actor; fileId: string; key?: string }): Promise<FileView> {
  const file = await load(input.fileId);
  if (!canRead(file, input.actor, input.key)) throw new FileError("NOT_FOUND", "No such file");
  return view(file);
}

/**
 * The worker's job: size, virus scan, type by content, clean images, then move out of quarantine. Throws only when
 * the check couldn't run (storage or clamd down), so the queue retries; a refused file is an answer, not an error.
 */
export async function processFile(fileId: string): Promise<FileStatus> {
  const file = await load(fileId);
  if (file.status !== "Checking") return file.status as FileStatus;
  const kind = file.kind as FileKind;
  const rule = FILE_KINDS[kind];
  const { quarantine } = buckets();

  const bytes = await readObject(quarantine, file.quarantineKey, maxBytes(kind)).catch((error: unknown) => {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return "missing" as const;
    throw error;
  });
  if (bytes === "missing") {
    await reject(file, "missing");
    return "Rejected";
  }
  if (bytes === "too-large") {
    await reject(file, "size", { bytes: file.declaredBytes });
    return "Rejected";
  }

  const scan = await scanBytes(bytes);
  if (!scan.clean) {
    await reject(file, "virus", { bytes: bytes.length, threat: scan.threat });
    return "Rejected";
  }

  const detected = sniffType(bytes);
  if (!detected || !(rule.types as readonly FileType[]).includes(detected)) {
    await reject(file, "type", { bytes: bytes.length });
    return "Rejected";
  }

  const bucket = rule.visibility === "public" ? buckets().public : buckets().private;
  const cache = rule.visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store";
  const base = `${kind}/${file.id}`;
  let body = bytes;
  let type: string = detected;
  const variants: Record<string, string> = {};
  if (detected.startsWith("image/")) {
    let clean;
    try {
      clean = await cleanImage(bytes, detected);
    } catch {
      await reject(file, "unreadable", { bytes: bytes.length });
      return "Rejected";
    }
    body = clean.body;
    type = clean.type;
    for (const v of clean.variants) {
      const key = `${base}/w${String(v.width)}.webp`;
      await writeObject(bucket, key, v.body, { type: "image/webp", cache });
      variants[String(v.width)] = key;
    }
  }
  const objectKey = `${base}/original.${EXTENSION[type as FileType]}`;
  await writeObject(bucket, objectKey, body, { type, cache });
  await getDb()
    .update(f)
    .set({
      status: "Available",
      detectedType: type,
      bytes: body.length,
      sha256: createHash("sha256").update(body).digest("hex"),
      bucket,
      objectKey,
      variants,
      checkedAt: new Date(),
    })
    .where(and(eq(f.id, file.id), eq(f.status, "Checking")));
  await removeObject(quarantine, file.quarantineKey);
  return "Available";
}

/**
 * A link that opens the file for a few minutes, after the permission check. Opening a personal document is audited.
 */
export async function fileLink(input: {
  actor: Actor;
  fileId: string;
  key?: string;
  context?: RequestContext;
}): Promise<{ url: string; expiresAt: Date }> {
  const file = await load(input.fileId);
  // Someone who may not see the file learns nothing about it, not even that it exists.
  if (!canRead(file, input.actor, input.key) && !(await onLiveProduct(file))) {
    throw new FileError("NOT_FOUND", "No such file");
  }
  if (file.status !== "Available" || !file.bucket || !file.objectKey || file.deletedAt) {
    throw new FileError("NOT_FOUND", "This file can't be opened");
  }
  const rule = FILE_KINDS[file.kind as FileKind];
  if (rule.sensitive) {
    await audit(getDb(), {
      actorId: input.actor.userId,
      action: "file.open",
      resourceType: "file",
      resourceId: file.id,
      companyId: file.organisationId,
      after: { kind: file.kind },
      context: input.context,
    });
  }
  const expiresAt = new Date(Date.now() + DOWNLOAD_LINK_SECONDS * 1000);
  if (rule.visibility === "public") return { url: publicUrl(file.objectKey), expiresAt };
  const url = await signDownload(file.bucket, file.objectKey, {
    seconds: DOWNLOAD_LINK_SECONDS,
    type: file.detectedType ?? "application/octet-stream",
    fileName: file.name,
  });
  return { url, expiresAt };
}

/** Public image URLs for an Available public file (logo, product image), by width. */
export function publicImage(file: Pick<FileRow, "objectKey" | "variants">) {
  return {
    original: file.objectKey ? publicUrl(file.objectKey) : null,
    sizes: Object.fromEntries(Object.entries(file.variants ?? {}).map(([w, k]) => [w, publicUrl(k)])),
  };
}

/** Ties a checked file to its record, for example a support request. Only the uploader can attach it. */
export async function attachFile(
  ex: Executor,
  input: { actor: Actor; fileId: string; key?: string; kind: FileKind; attachedType: string; attachedId: string },
): Promise<void> {
  const file = await load(input.fileId);
  if (!isUploader(file, input.actor, input.key) || file.kind !== input.kind) {
    throw new FileError("NOT_FOUND", "No such file");
  }
  if (file.status !== "Available") throw new FileError("INVALID", "The file is still being checked");
  if (file.attachedId && (file.attachedId !== input.attachedId || file.attachedType !== input.attachedType)) {
    throw new FileError("INVALID", "The file is already used");
  }
  await ex.update(f).set({ attachedType: input.attachedType, attachedId: input.attachedId }).where(eq(f.id, file.id));
}

/** Sets when a file is removed by the retention rule (Work ID: A22). */
export async function scheduleFileDeletion(ex: Executor, fileId: string, at: Date): Promise<void> {
  await ex.update(f).set({ deleteAfter: at }).where(eq(f.id, fileId));
}

/**
 * Housekeeping (scheduled with the clocks in step 3.8): removes files past their retention date, gives up on uploads
 * that never finished, and re-queues files whose check was never queued (Redis was down).
 */
export async function sweepFiles(enqueue: (fileId: string) => Promise<void>) {
  const db = getDb();
  const due = await db
    .select()
    .from(f)
    .where(and(lt(f.deleteAfter, sql`now()`), isNull(f.deletedAt)))
    .limit(500);
  for (const file of due) {
    if (file.bucket && file.objectKey) {
      for (const key of [file.objectKey, ...Object.values(file.variants ?? {})]) await removeObject(file.bucket, key);
    }
    await db.update(f).set({ status: "Deleted", deletedAt: new Date() }).where(eq(f.id, file.id));
    await audit(db, {
      action: "file.deleted",
      resourceType: "file",
      resourceId: file.id,
      companyId: file.organisationId,
      reason: "Retention period ended",
      after: { kind: file.kind },
    });
  }
  const abandoned = await db
    .select()
    .from(f)
    .where(and(eq(f.status, "Uploading"), lt(f.createdAt, sql`now() - interval '24 hours'`)))
    .limit(500);
  for (const file of abandoned) {
    await removeObject(buckets().quarantine, file.quarantineKey).catch(() => undefined);
  }
  if (abandoned.length > 0) {
    await db
      .update(f)
      .set({ status: "Abandoned" })
      .where(
        inArray(
          f.id,
          abandoned.map((x) => x.id),
        ),
      );
  }
  const stuck = await db
    .select({ id: f.id })
    .from(f)
    .where(and(eq(f.status, "Checking"), lt(f.updatedAt, sql`now() - interval '10 minutes'`)))
    .limit(500);
  for (const file of stuck) await enqueue(file.id);
  return { deleted: due.length, abandoned: abandoned.length, requeued: stuck.length };
}
