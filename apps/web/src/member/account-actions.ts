"use server";

import { getDb } from "@h2india/core";
import {
  ProfileError,
  saveMemberPreferences,
  saveProfile,
  unsubscribeEverything,
  type PreferencesInput,
  type ProfileInput,
} from "@h2india/core/members";
import { revalidatePath } from "next/cache";
import { mayUseMember } from "@h2india/core/members";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Profile (545:8) and Newsletters and notifications (548:8), step 7.4: the signed-in member's own only.

async function me() {
  const s = await getSession();
  if (!s) throw new Error("Sign in again.");
  // Members only (founder QC, 17 Nov 2026): buyers and suppliers join as members first.
  if (!(await mayUseMember(getDb(), s.user.id))) throw new Error("Join as a member to use this.");
  return s.user.id;
}

export async function saveProfileAction(
  input: ProfileInput,
): Promise<{ ok: true } | { ok: false; problems: Record<string, string> }> {
  const userId = await me();
  try {
    await saveProfile(getDb(), userId, input, await requestContext());
  } catch (error) {
    if (error instanceof ProfileError) return { ok: false, problems: error.problems };
    return { ok: false, problems: { _: "Your profile wasn't saved. Try again." } };
  }
  revalidatePath("/member/profile");
  revalidatePath("/member/directory/people");
  return { ok: true };
}

export async function savePreferencesAction(input: PreferencesInput): Promise<{ ok: boolean }> {
  await saveMemberPreferences(getDb(), await me(), input, await requestContext());
  revalidatePath("/member/preferences");
  return { ok: true };
}

export async function unsubscribeAllAction(on: boolean): Promise<void> {
  await unsubscribeEverything(getDb(), await me(), on, await requestContext());
  revalidatePath("/member/preferences");
}
