import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { parseServerEnv } from "@h2india/config";

// Object storage (step 3.7). Three buckets: quarantine (browser uploads, unchecked), private (documents, opened only by
// signed link) and public (checked images). Files are served from the storage domain, never the application's.

let client: S3Client | undefined;

export function s3(): S3Client {
  const env = parseServerEnv();
  client ??= new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    // MinIO and other S3-compatible stores need path-style URLs; AWS works with either.
    forcePathStyle: !env.S3_ENDPOINT.includes("amazonaws.com"),
    // Only send checksums S3 asks for: browsers can't compute the SDK's default ones for signed uploads.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

export function buckets() {
  const env = parseServerEnv();
  return { quarantine: env.S3_BUCKET_QUARANTINE, private: env.S3_BUCKET_PRIVATE, public: env.S3_BUCKET_PUBLIC };
}

/** A link the browser PUTs the file to. Type and size are part of the signature, so neither can change. */
export async function signUpload(key: string, type: string, bytes: number, seconds: number): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: buckets().quarantine,
    Key: key,
    ContentType: type,
    ContentLength: bytes,
  });
  return getSignedUrl(s3(), command, { expiresIn: seconds, signableHeaders: new Set(["content-type"]) });
}

export async function signDownload(
  bucket: string,
  key: string,
  opts: { seconds: number; type: string; fileName: string },
): Promise<string> {
  const ascii = opts.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: opts.type,
    ResponseContentDisposition: `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(opts.fileName)}`,
    ResponseCacheControl: "private, no-store",
  });
  return getSignedUrl(s3(), command, { expiresIn: opts.seconds });
}

export async function headObject(bucket: string, key: string): Promise<{ bytes: number } | null> {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { bytes: head.ContentLength ?? 0 };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || status === 403) return null;
    throw error;
  }
}

/** Reads a whole object, refusing to read more than limit bytes. */
export async function readObject(bucket: string, key: string, limit: number): Promise<Uint8Array | "too-large"> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if ((res.ContentLength ?? 0) > limit) {
    res.Body?.transformToWebStream()
      .cancel()
      .catch(() => undefined);
    return "too-large";
  }
  const body = await res.Body?.transformToByteArray();
  if (!body) throw new Error(`empty object ${bucket}/${key}`);
  return body.length > limit ? "too-large" : body;
}

export async function writeObject(
  bucket: string,
  key: string,
  body: Uint8Array,
  opts: { type: string; cache?: string },
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: opts.type,
      CacheControl: opts.cache ?? "private, no-store",
      // Stops browsers guessing a different type from the bytes.
      Metadata: { "x-content-type-options": "nosniff" },
    }),
  );
}

export async function removeObject(bucket: string, key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function publicUrl(key: string): string {
  const env = parseServerEnv();
  const base = env.S3_PUBLIC_URL ?? `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET_PUBLIC}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}
