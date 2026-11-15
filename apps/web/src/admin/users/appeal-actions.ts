"use server";

import { getDb } from "@h2india/core";
import { decideAppeal } from "@h2india/core/admin/appeals";
import { UserAdminError } from "@h2india/core/admin/users";
import { loadActor } from "@h2india/core/authz";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

export async function decideAppealAction(id: string, lift: boolean, note: string) {
  const session = await operatorSession();
  if (!session) return { ok: false as const, error: "Sign in again." };
  try {
    await decideAppeal(getDb(), await loadActor(getDb(), session.user.id), id, { lift, note }, await requestContext());
  } catch (error) {
    if (error instanceof UserAdminError) return { ok: false as const, error: error.message };
    throw error;
  }
  revalidatePath("/admin/users/appeals");
  return { ok: true as const };
}
