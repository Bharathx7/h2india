import { cookieConsents } from "@h2india/db";
import { getDb } from "../db";
import { COOKIE_CONSENT_VERSION, readConsent } from "./cookies";

export * from "./cookies";

/** Keeps a record of the choice (version, categories, when) against the browser's random id. No personal data. */
export async function recordCookieConsent(value: string, source: "banner" | "preferences"): Promise<boolean> {
  const choice = readConsent(value);
  if (!choice) return false;
  await getDb().insert(cookieConsents).values({
    browserId: choice.browserId,
    version: COOKIE_CONSENT_VERSION,
    analytics: choice.analytics,
    source,
  });
  return true;
}
export * from "./records";
export * from "./wording";
