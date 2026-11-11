import { describe, expect, it } from "vitest";
import { normaliseMobile, shortCompanyName } from "./rules";
import { gstinCheckChar, isValidGstin, normaliseGstin, panOf, stateOf } from "./gstin";

describe("GSTIN rules", () => {
  it("accepts a GSTIN with the right check character and state", () => {
    expect(isValidGstin("27AAKCG5521M1Z9")).toBe(true);
    expect(stateOf("27AAKCG5521M1Z9")).toBe("Maharashtra");
    expect(panOf("27AAKCG5521M1Z9")).toBe("AAKCG5521M");
  });

  it.each([
    ["a wrong check character", "27AAKCG5521M1Z3"],
    ["14 characters", "27AAKCG5521M1Z"],
    ["an unknown state code", "00AAKCG5521M1Z9"],
    ["a missing Z", "27AAKCG5521M1A9"],
  ])("refuses %s", (_, value) => {
    expect(isValidGstin(value)).toBe(false);
  });

  it("ignores spaces and case, as pasted from certificates", () => {
    expect(normaliseGstin(" 27aakcg5521m1z9 ")).toBe("27AAKCG5521M1Z9");
    expect(isValidGstin("27 aakcg 5521m1z9")).toBe(true);
  });

  it("computes the check character", () => {
    expect(gstinCheckChar("27AAACG1234H1Z")).toBe("0");
  });
});

describe("join helpers", () => {
  it("reads Indian mobile numbers in their usual forms", () => {
    expect(normaliseMobile("98201 23456")).toBe("+91 98201 23456");
    expect(normaliseMobile("+91-9820123456")).toBe("+91 98201 23456");
    expect(normaliseMobile("09820123456")).toBe("+91 98201 23456");
    expect(normaliseMobile("12345")).toBeNull();
    expect(normaliseMobile("5820123456")).toBeNull();
  });

  it("writes company names the way the screens do", () => {
    expect(shortCompanyName("Greenfield Mobility Solutions Private Limited")).toBe("Greenfield Mobility Solutions");
    expect(shortCompanyName("Greenfield Energy Systems LLP")).toBe("Greenfield Energy Systems");
  });
});
