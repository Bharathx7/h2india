"use server";

import { getDb } from "@h2india/core";
import {
  ClaimError,
  claimTarget,
  confirmEmailClaim,
  requestToJoin,
  startEmailClaim,
  submitGstinClaim,
} from "@h2india/core/companies";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Claim this profile (step 6.7). Every action needs a signed-in person; core checks the domain, the code, the GSTIN and
// whether the profile is still unclaimed.

export type ClaimResult = { ok: true; claimId?: string } | { ok: false; errors: Record<string, string> };

async function run(
  slug: string,
  work: (userId: string, name: string) => Promise<{ claimId?: string } | undefined>,
): Promise<ClaimResult> {
  const session = await getSession();
  if (!session) return { ok: false, errors: { _: "Sign in to claim this profile." } };
  try {
    const r = await work(session.user.id, session.user.name);
    revalidatePath(`/directory/companies/${slug}/claim`);
    return { ok: true, ...(r ?? {}) };
  } catch (error) {
    if (error instanceof ClaimError) return { ok: false, errors: { [error.field]: error.message } };
    throw error;
  }
}

export async function sendClaimCodeAction(slug: string, email: string) {
  return run(slug, async (userId, name) =>
    startEmailClaim(getDb(), { slug, userId, email, name, context: await requestContext() }),
  );
}

export async function confirmClaimCodeAction(slug: string, claimId: string, code: string) {
  return run(slug, async (userId) => {
    await confirmEmailClaim(getDb(), { claimId, userId, code, context: await requestContext() });
    return undefined;
  });
}

export async function submitGstinClaimAction(slug: string, gstin: string, letterFileId: string) {
  return run(slug, async (userId) =>
    submitGstinClaim(getDb(), { slug, userId, gstin, letterFileId, context: await requestContext() }),
  );
}

/** Already claimed (494:427): ask the company's admins to let you join. */
export async function requestToJoinAction(slug: string) {
  return run(slug, async (userId) => {
    const target = await claimTarget(getDb(), slug);
    if (!target) throw new ClaimError("This company isn't in the directory.");
    await requestToJoin({ userId, organisationId: target.organisationId, context: await requestContext() });
    return undefined;
  });
}
