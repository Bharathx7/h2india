"use server";

import { getDb } from "@h2india/core";
import { AccountDetailsError, saveAccountDetails } from "@h2india/core/account";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

type Result = { ok: true } | { ok: false; error: string; problems?: Record<string, string> };

/** Your details on Account: the signed-in person's own name and job role (founder QC, 17 Nov 2026). */
export async function saveAccountDetailsAction(input: { name: string; jobRole: string | null }): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  try {
    await saveAccountDetails(
      getDb(),
      session.user.id,
      // A server action is callable from any browser, so the shapes are checked, not trusted.
      {
        name: typeof input.name === "string" ? input.name : "",
        jobRole: typeof input.jobRole === "string" && input.jobRole ? input.jobRole : null,
      },
      await requestContext(),
    );
  } catch (error) {
    if (error instanceof AccountDetailsError) return { ok: false, error: error.message, problems: error.problems };
    return { ok: false, error: "We couldn't save your details. Try again." };
  }
  revalidatePath("/account");
  return { ok: true };
}
