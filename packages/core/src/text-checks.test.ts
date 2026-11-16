import { describe, expect, it } from "vitest";
import { looksLikeEmail, looksLikeWebAddress, trimChars, trimEndChars } from "./text-checks";

describe("text checks without slow regular expressions", () => {
  it("emails", () => {
    expect(looksLikeEmail("ravi@greenfield.in")).toBe(true);
    for (const bad of ["ravi@", "@x.in", "ravi@x", "a b@x.in", "a@b@c.in", "ravi@x."])
      expect(looksLikeEmail(bad)).toBe(false);
    expect(looksLikeEmail(`${"!.".repeat(50_000)}@x.in`)).toBe(false);
  });

  it("web addresses", () => {
    expect(looksLikeWebAddress("https://h2economy.co/news")).toBe(true);
    expect(looksLikeWebAddress("http://example.com")).toBe(false);
    expect(looksLikeWebAddress("http://example.com", { allowHttp: true })).toBe(true);
    for (const bad of ["https://localhost", "ftp://x.in", "https://x .in", "x.in"])
      expect(looksLikeWebAddress(bad)).toBe(false);
    expect(looksLikeWebAddress(`https://${"!.".repeat(50_000)}`)).toBe(false);
  });

  it("trims a character from both ends only", () => {
    expect(trimChars("--a-b--", "-")).toBe("a-b");
    expect(trimChars("___", "_")).toBe("");
    expect(trimEndChars("/news///", "/")).toBe("/news");
    expect(trimEndChars("/", "/")).toBe("");
  });
});
