import { bigint, index, jsonb, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";

// Uploaded files (step 3.7). The bytes live in object storage; this row says what the file is, who may see it and
// whether it passed the checks. Status: Uploading → Checking → Available or Rejected; later Deleted.
export const files = core.table(
  "files",
  {
    id: id(),
    /** verification_document, work_id, quote_attachment, datasheet, logo, product_image, delivery_photo */
    kind: text("kind").notNull(),
    status: text("status").notNull().default("Uploading"),
    /** Who uploaded it; empty for a signed-out upload (a lost-email support request). */
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    /** The company that owns it, if any. Company members with company.view can open it. */
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    /** Proof for a signed-out uploader: hash of the key returned once when the upload started. */
    uploadKeyHash: text("upload_key_hash"),
    /** The record it belongs to once attached, for example recovery_request and its id. */
    attachedType: text("attached_type"),
    attachedId: text("attached_id"),
    /** File name as the person chose it, cleaned. */
    name: text("name").notNull(),
    declaredType: text("declared_type").notNull(),
    declaredBytes: bigint("declared_bytes", { mode: "number" }).notNull(),
    /** Filled in by the worker. */
    detectedType: text("detected_type"),
    bytes: bigint("bytes", { mode: "number" }),
    sha256: text("sha256"),
    quarantineKey: text("quarantine_key").notNull(),
    bucket: text("bucket"),
    objectKey: text("object_key"),
    /** Image sizes made by the worker: width → object key. */
    variants: jsonb("variants").$type<Record<string, string>>(),
    /** size · type · virus · unreadable · missing */
    rejectReason: text("reject_reason"),
    /** The virus name when the scan found one. */
    threat: text("threat"),
    checkedAt: utc("checked_at"),
    /** When the retention rule removes it (Work ID: 30 days after its request closes, A22). */
    deleteAfter: utc("delete_after"),
    deletedAt: utc("deleted_at"),
    ...timestamps,
  },
  (t) => [
    index("files_status_idx").on(t.status, t.createdAt),
    index("files_attached_idx").on(t.attachedType, t.attachedId),
    index("files_org_idx").on(t.organisationId),
  ],
);
