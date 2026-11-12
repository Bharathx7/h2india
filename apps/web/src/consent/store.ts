"use client";

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  readConsent,
  writeConsent,
  type CookieChoice,
} from "@h2india/core/consent/cookies";
import { useSyncExternalStore } from "react";
import { recordConsent } from "@/server/public-forms";

// The browser's cookie choice (step 5.9), kept in a first-party cookie so the server can read it too. Changing it
// records the choice and tells the analytics loader at once.

const EVENT = "h2-consent";

function cookieValue(): string | null {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return hit ? hit.slice(CONSENT_COOKIE.length + 1) : null;
}

export function currentChoice(): CookieChoice | null {
  return typeof document === "undefined" ? null : readConsent(cookieValue());
}

function browserId(): string {
  return currentChoice()?.browserId ?? crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export async function saveChoice(analytics: boolean, source: "banner" | "preferences"): Promise<void> {
  const value = writeConsent({ analytics, browserId: browserId() });
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; Max-Age=${String(CONSENT_MAX_AGE)}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
  await recordConsent(value, source).catch(() => false);
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
  };
}

/** The current choice; `undefined` while rendering on the server (so nothing flashes). */
export function useCookieChoice(): CookieChoice | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => cookieValue() ?? "",
    () => undefined,
  );
  return raw === undefined ? undefined : readConsent(raw);
}
