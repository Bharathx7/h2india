import { describe, expect, it } from "vitest";
import { analyticsAllowed, COOKIE_CONSENT_VERSION, readConsent, writeConsent } from "./cookies";

describe("cookie consent", () => {
  it("reads back what it wrote, and ignores old versions and damage", () => {
    const v = writeConsent({ analytics: true, browserId: "abc123def" });
    expect(readConsent(v)).toEqual({ version: COOKIE_CONSENT_VERSION, analytics: true, browserId: "abc123def" });
    expect(readConsent(v.replace(COOKIE_CONSENT_VERSION, "cookies-2020-01-01"))).toBeNull();
    expect(readConsent(`${COOKIE_CONSENT_VERSION}.2.abc123def`)).toBeNull();
    expect(readConsent(`${COOKIE_CONSENT_VERSION}.1.<script>`)).toBeNull();
    expect(readConsent(undefined)).toBeNull();
  });

  it("allows analytics only with consent and never for operators", () => {
    const yes = readConsent(writeConsent({ analytics: true, browserId: "abc123def" }));
    const no = readConsent(writeConsent({ analytics: false, browserId: "abc123def" }));
    expect(analyticsAllowed(yes, null)).toBe(true);
    expect(analyticsAllowed(yes, { operator: true })).toBe(false);
    expect(analyticsAllowed(no, null)).toBe(false);
    expect(analyticsAllowed(null, null)).toBe(false);
  });
});
