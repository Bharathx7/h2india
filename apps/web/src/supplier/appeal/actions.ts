"use server";

import { sendAppeal } from "@h2india/core/admin/appeals";
import { UserAdminError } from "@h2india/core/admin/users";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "../actor";

// Appeal a suspension (G10). The company is the person's own supplier company.
export async function appealAction(reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db, actor, supplier } = await supplierActor();
  try {
    await sendAppeal(db, actor, supplier.organisationId, reason, await requestContext());
  } catch (error) {
    if (error instanceof UserAdminError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/supplier");
  return { ok: true };
}
