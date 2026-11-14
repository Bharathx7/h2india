"use server";

import type { JobPostInput } from "@h2india/core/opportunities/rules";
import {
  currentPoster,
  inputOf,
  ownJobPost,
  saveJobPost,
  type SaveIntent,
  type SaveResult,
} from "@/opportunities/posting";

// Server side of Post a job (467:7472) and its preview (468:7854). Every check runs here; the form only mirrors them.

export async function saveJob(
  input: JobPostInput & { id: number | null; organisationId: string },
  intent: SaveIntent,
): Promise<SaveResult> {
  const poster = await currentPoster();
  if (!poster) return { ok: false, errors: {}, message: "Sign in again to post this job." };
  try {
    return await saveJobPost(poster, input, intent);
  } catch (error) {
    console.error("[jobs] saving a job post failed", error);
    return { ok: false, errors: {}, message: "We couldn’t save your job. Try again." };
  }
}

/** "Submit for review" on the preview: the saved job, checked again in full. */
export async function submitJob(id: number): Promise<SaveResult> {
  const poster = await currentPoster();
  if (!poster) return { ok: false, errors: {}, message: "Sign in again to submit this job." };
  const job = await ownJobPost(poster, id);
  if (!job) return { ok: false, errors: {}, message: "This job can no longer be changed here." };
  const result = await saveJobPost(poster, inputOf(job), "submit");
  return result.ok || Object.keys(result.errors).length === 0
    ? result
    : { ok: false, errors: result.errors, message: "Some details need changing. Edit the job and try again." };
}
