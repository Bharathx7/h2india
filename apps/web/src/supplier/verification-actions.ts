"use server";

import { uploadDocument, VerificationError } from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actions";

// Upload a document (272:4545), step 8.2. The company is the person's own supplier company.

export async function uploadDocumentAction(input: {
  type: string;
  name?: string;
  scope?: string;
  number?: string;
  fileId: string;
  issuedBy?: string;
  expiresOn?: string;
  replaces?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    await uploadDocument(
      db,
      actor,
      supplier.organisationId,
      { ...input, expiresOn: input.expiresOn ? new Date(`${input.expiresOn}T23:59:59+05:30`) : null },
      await requestContext(),
    );
  } catch (error) {
    if (error instanceof VerificationError) return { ok: false, error: error.message };
    return { ok: false, error: "The document wasn't saved. Try again." };
  }
  revalidatePath("/supplier/verification");
  revalidatePath("/supplier");
  return { ok: true };
}
