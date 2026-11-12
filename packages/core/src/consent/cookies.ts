// Cookie consent (step 5.9, banner 53:1455, Cookie policy 521:459). Pure: shared by the browser (banner, preferences,
// analytics loader) and the server. Necessary cookies are always on; Analytics is the only optional category until M10
// decides the tool and any others. Bump COOKIE_CONSENT_VERSION when the categories or the banner's words change, so
// everyone is asked again.

export const COOKIE_CONSENT_VERSION = "cookies-2026-11-13";
export const CONSENT_COOKIE = "h2_consent";
/** A year, then we ask again. */
export const CONSENT_MAX_AGE = 365 * 24 * 3600;

export interface CookieChoice {
  version: string;
  analytics: boolean;
  /** A random id for this browser, kept with the consent record. */
  browserId: string;
}

/** "cookies-2026-11-13.1.k3j4h5" → the choice, or null when missing, damaged or from an older version. */
export function readConsent(value: string | null | undefined): CookieChoice | null {
  if (!value) return null;
  const [version, analytics, browserId] = decodeURIComponent(value).split(".");
  if (version !== COOKIE_CONSENT_VERSION || (analytics !== "0" && analytics !== "1") || !browserId) return null;
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(browserId)) return null;
  return { version, analytics: analytics === "1", browserId };
}

export function writeConsent(choice: Omit<CookieChoice, "version">): string {
  return `${COOKIE_CONSENT_VERSION}.${choice.analytics ? "1" : "0"}.${choice.browserId}`;
}

/** Analytics run only with consent, and never for operators (playbook step 5.9). */
export function analyticsAllowed(choice: CookieChoice | null, viewer: { operator: boolean } | null): boolean {
  return Boolean(choice?.analytics) && !viewer?.operator;
}
