import { describe, expect, it } from "vitest";
import { formatIstTime, normaliseEmail, safeReturnPath } from "./rules";

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
