import type { FileKind } from "@h2india/config/files";
import type { CompanyPermission, OperatorPermission } from "../authz/catalogue";

// Who may upload and who may open each kind of file (step 3.7). Least access: a company permission that fits the
// document, or the operator area that works with it. The uploader can always open their own file.

export type UploadRule =
  | { who: "anyone" }
  | { who: "signed-in" }
  | { who: "company"; permission: CompanyPermission[] }
  | { who: "not-yet"; until: string };

export const UPLOAD_RULES: Record<FileKind, UploadRule> = {
  // A person who lost their work email is signed out (528:534). Limited per IP address instead.
  work_id: { who: "anyone" },
  verification_document: { who: "company", permission: ["verification.manage"] },
  quote_attachment: { who: "company", permission: ["rfq.create", "quote.send"] },
  datasheet: { who: "company", permission: ["product.manage"] },
  product_image: { who: "company", permission: ["product.manage"] },
  // Company logo (company.manage) or an event or press submission by a signed-in person (Stage 5).
  logo: { who: "signed-in" },
  // The delivery link (695:13) gives its own proof; it arrives with deliveries in Stage 10.
  delivery_photo: { who: "not-yet", until: "Stage 10 delivery link" },
};

export const READ_RULES: Record<FileKind, { company?: CompanyPermission; operator?: OperatorPermission }> = {
  work_id: { operator: "users.view" },
  verification_document: { company: "verification.manage", operator: "verification.view" },
  quote_attachment: { company: "rfq.view", operator: "queues.view" },
  datasheet: { company: "company.view", operator: "catalogue.view" },
  product_image: { company: "company.view", operator: "catalogue.view" },
  logo: { company: "company.view", operator: "catalogue.view" },
  delivery_photo: { company: "order.view", operator: "orders.view" },
};
