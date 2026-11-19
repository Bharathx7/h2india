"use server";

import { getDb } from "@h2india/core";
import { changePassword, setFirstPassword } from "@h2india/core/sign-in/passwords";
import { headers } from "next/headers";
import { auth, getSession } from "@/server/auth";

// Change password and Set your password (founder, 19 Nov 2026, A195). The rules live in core
// (@h2india/core/sign-in/passwords); these only pass the signed-in person's request through.

export type PasswordResult =
  | { ok: true }
  | { ok: false; code: "INVALID_NEW"; message: string }
  | { ok: false; code: "WRONG_PASSWORD"; triesLeft: number }
  | { ok: false; code: "PAUSED"; until: string }
  | { ok: false; code: "NOT_SIGNED_IN" | "NO_PASSWORD" | "HAS_PASSWORD" | "FAILED" };

/** Current password, then the new one. Signs the person out on every other device. */
export async function changePasswordAction(current: string, next: string): Promise<PasswordResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "NOT_SIGNED_IN" };
  const result = await changePassword(getDb(), auth, await headers(), { userId: session.user.id, current, next });
  if (!result.ok && result.code === "PAUSED") return { ok: false, code: "PAUSED", until: result.until.toISOString() };
  return result;
}

/** A signed-in person with no password yet (invited, or joined with a code) chooses one. */
export async function setPasswordAction(password: string): Promise<PasswordResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "NOT_SIGNED_IN" };
  try {
    return await setFirstPassword(getDb(), auth, await headers(), { userId: session.user.id, password });
  } catch (error) {
    console.error("set password failed", error);
    return { ok: false, code: "FAILED" };
  }
}
