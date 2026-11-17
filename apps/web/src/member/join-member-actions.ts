"use server";

import { getDb } from "@h2india/core";
import { joinAsMember, MembershipError } from "@h2india/core/members";
import { safeReturnPath } from "@h2india/core/sign-in";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Join as member (founder QC, 17 Nov 2026): a signed-in buyer or supplier switches membership on for their own
// account, then goes back to the member feature they asked for.

export async function joinAsMemberAction(
  next: string,
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  try {
    await joinAsMember(getDb(), session.user.id, await requestContext());
  } catch (error) {
    if (error instanceof MembershipError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: true, to: safeReturnPath(typeof next === "string" ? next : "", "/member") };
}
