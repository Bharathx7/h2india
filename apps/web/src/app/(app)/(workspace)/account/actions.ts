"use server";

import { getDb } from "@h2india/core";
import { AccountDetailsError, saveAccountDetails, setAccountPhoto } from "@h2india/core/account";
import { FileError } from "@h2india/core/files";
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

/** Profile picture on Account (founder, 20 Nov 2026): the signed-in person's own picture, set or removed. */
export async function setAccountPhotoAction(fileId: string | null): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  if (fileId !== null && typeof fileId !== "string") return { ok: false, error: "Choose a picture." };
  try {
    await setAccountPhoto(getDb(), session.user.id, fileId, await requestContext());
  } catch (error) {
    if (error instanceof FileError) return { ok: false, error: error.message };
    return { ok: false, error: "We couldn't save your picture. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
