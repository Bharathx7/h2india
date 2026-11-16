"use server";

import { getDb } from "@h2india/core";
import { addSupplierByOperator, CompanyAdminError } from "@h2india/core/admin/companies";
import { loadActor } from "@h2india/core/authz";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Add a supplier (admin QC, 16 Nov 2026). Core checks users.edit, creates the company as Join does and invites the
// owner as Admin.

type R =
  | { ok: true; organisationId: string; legalName: string }
  | { ok: false; error: string; errors?: Record<string, string>; existingId?: string };

export async function addSupplierAction(input: { gstin: string; name: string; ownerEmail: string }): Promise<R> {
  const session = await operatorSession();
  if (!session) return { ok: false, error: "Sign in again." };
  const actor = await loadActor(getDb(), session.user.id);
  try {
    const made = await addSupplierByOperator(getDb(), actor, input, await requestContext());
    revalidatePath("/admin/users");
    return { ok: true, ...made };
  } catch (error) {
    if (error instanceof CompanyAdminError)
      return { ok: false, error: error.message, errors: error.errors, existingId: error.existingId };
    if (error instanceof Error && /Not allowed/.test(error.message))
      return { ok: false, error: "Adding a company needs Users editing (Super admin)." };
    throw error;
  }
}
