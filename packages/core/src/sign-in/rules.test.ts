import { describe, expect, it } from "vitest";
import {
  formatIstTime,
  landingAfterSignIn,
  looksLikeEmail,
  newPasswordProblem,
  normaliseEmail,
  safeReturnPath,
  SIGN_IN,
  siteSignIn,
} from "./rules";

describe("return to the page the person started from", () => {
  it("keeps a path on this site, with its query and anchor", () => {
    expect(safeReturnPath("/marketplace/systems/electrolysers?sort=new#top")).toBe(
      "/marketplace/systems/electrolysers?sort=new#top",
    );
  });

  it.each([
    ["another site", "https://evil.example/x"],
    ["a protocol-relative address", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a tab inside the path", "/\t/evil.example"],
    ["a script address", "javascript:alert(1)"],
    ["a relative path", "marketplace"],
    ["the sign-in page itself", "/sign-in?next=/x"],
    ["an API route", "/api/auth/sign-out"],
    ["nothing", undefined],
    ["a list", ["/a", "/b"]],
  ])("refuses %s", (_, value) => {
    expect(safeReturnPath(value)).toBe("/");
  });

  it("does not treat a page that only starts with the same letters as sign-in", () => {
    expect(safeReturnPath("/sign-in-help")).toBe("/sign-in-help");
  });
});

describe("email and time helpers", () => {
  it("compares emails without case or spaces", () => {
    expect(normaliseEmail("  Ravi@GreenfieldH2.in ")).toBe("ravi@greenfieldh2.in");
  });

  it("shows times in India time, as the designs do", () => {
    expect(formatIstTime(new Date("2026-11-11T16:28:00Z"))).toBe("9:58 PM");
  });
});

describe("a plausible email address", () => {
  it.each(["owner@example.com", "  ravi.k@plant.co.in "])("accepts %s", (v) => {
    expect(looksLikeEmail(v)).toBe(true);
  });
  it.each(["", "owner", "@example.com", "owner@example", "owner@.com", "owner@com.", "a@b@c.com", "a b@c.com"])(
    "refuses %j",
    (v) => {
      expect(looksLikeEmail(v)).toBe(false);
    },
  );
  it("answers at once on a long crafted input", () => {
    const start = Date.now();
    expect(looksLikeEmail(`a@${"!.".repeat(100_000)}`)).toBe(false);
    expect(Date.now() - start).toBeLessThan(200);
  });
});

describe("the admin domain signs in staff only", () => {
  it("lets anyone through on the public site and on one app serving both", () => {
    expect(siteSignIn("public", false, "/buyer")).toEqual({ ok: true, to: "/buyer" });
    expect(siteSignIn("both", false, "/")).toEqual({ ok: true, to: "/" });
    expect(siteSignIn("public", true, "/")).toEqual({ ok: true, to: "/" });
  });

  it("turns away a buyer, supplier or member on the admin site", () => {
    expect(siteSignIn("admin", false, "/admin")).toEqual({ ok: false, reason: "not-staff" });
  });

  it("sends an operator to the back office, or back to the admin page they came from", () => {
    expect(siteSignIn("admin", true, "/")).toEqual({ ok: true, to: "/admin" });
    expect(siteSignIn("admin", true, "/admin/queues")).toEqual({ ok: true, to: "/admin/queues" });
  });
});

describe("buyer, supplier and member sign-in pages (public QC 2)", () => {
  it("the right page goes back to the page the person came from", () => {
    expect(landingAfterSignIn("buyer", "buyer", "/buyer/rfqs")).toEqual({ to: "/buyer/rfqs", wrongPage: false });
    expect(landingAfterSignIn("supplier", "supplier", "/marketplace")).toEqual({
      to: "/marketplace",
      wrongPage: false,
    });
  });

  it("the wrong page signs the person in to their own dashboard, with a note", () => {
    expect(landingAfterSignIn("buyer", "supplier", "/buyer")).toEqual({
      to: "/supplier?signed-in-as=buyer",
      wrongPage: true,
    });
    expect(landingAfterSignIn("member", "buyer", "/member")).toEqual({
      to: "/buyer?signed-in-as=member",
      wrongPage: true,
    });
  });

  it("a page outside the workspaces is still fine to return to", () => {
    expect(landingAfterSignIn("buyer", "supplier", "/account")).toEqual({ to: "/account", wrongPage: false });
  });

  it("someone who never finished joining goes to that page's sign-up", () => {
    expect(landingAfterSignIn("supplier", null, "/supplier")).toEqual({ to: "/join/supplier", wrongPage: false });
  });
});

// Founder, 19 Nov 2026 (A195): everyone signs in with a password; the forms and core share one length rule.
describe("a new password", () => {
  it("needs at least the minimum length", () => {
    expect(newPasswordProblem("a".repeat(SIGN_IN.passwordMinLength - 1))).toBe(
      `Use at least ${String(SIGN_IN.passwordMinLength)} characters`,
    );
    expect(newPasswordProblem("a".repeat(SIGN_IN.passwordMinLength))).toBeNull();
  });

  it("allows up to the maximum length", () => {
    expect(newPasswordProblem("a".repeat(SIGN_IN.passwordMaxLength))).toBeNull();
    expect(newPasswordProblem("a".repeat(SIGN_IN.passwordMaxLength + 1))).toBe(
      `Use at most ${String(SIGN_IN.passwordMaxLength)} characters`,
    );
  });
});
