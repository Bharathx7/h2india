"use server";

import { getDb } from "@h2india/core";
import { signOutMySessions } from "@h2india/core/account";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Sign-in and security (founder QC, 17 Nov 2026): sign out one other device, or all of them. Only the person's own
// sessions, never the one in use (core checks both).

type Result = { ok: true; ended: number } | { ok: false; error: string };

export async function signOutDeviceAction(sessionId: string | null): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };
  if (sessionId !== null && (typeof sessionId !== "string" || !/^[0-9a-z-]{8,64}$/i.test(sessionId)))
    return { ok: false, error: "That device isn't signed in any more." };
  const ended = await signOutMySessions(getDb(), {
    userId: session.user.id,
    currentSessionId: session.session.id,
    sessionId: sessionId ?? undefined,
    context: await requestContext(),
  });
  revalidatePath("/member/security");
  return { ok: true, ended };
}
