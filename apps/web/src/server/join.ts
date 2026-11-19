import { readDraft, startDraft } from "@h2india/core/companies";
import { cookies } from "next/headers";

// The Join draft cookie (step 3.3): a random token, http-only, this site only, 7 days.
export const JOIN_COOKIE = "h2_join";

export async function draftToken(): Promise<string | undefined> {
  return (await cookies()).get(JOIN_COOKIE)?.value;
}

/** The draft token, starting a draft if there is none (only from a server action or route handler). */
export async function ensureDraft(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(JOIN_COOKIE)?.value;
  if (existing && (await readDraft(existing))) return existing;
  const token = await startDraft();
  jar.set(JOIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return token;
}

/**
 * Takes over a draft from the confirm link, for when the link opens in a browser that never had the Join cookie
 * (another browser, a phone, an email app's own browser). The draft is only applied to the account whose email it
 * names (applyDraft), so the token alone changes nothing.
 */
export async function adoptDraft(token: string): Promise<void> {
  (await cookies()).set(JOIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearDraftCookie(): Promise<void> {
  (await cookies()).delete(JOIN_COOKIE);
}

/** Where a person's workspace is. */
export function workspaceFor(kind: string | null | undefined): string {
  if (kind === "supplier") return "/supplier";
  if (kind === "member") return "/member";
  return "/buyer";
}
