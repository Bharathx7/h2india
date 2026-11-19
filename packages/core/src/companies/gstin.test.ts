import { describe, expect, it } from "vitest";
import { normaliseMobile, shortCompanyName } from "./rules";
import {
  gstinCheckChar,
  gstinLabel,
  isValidGstin,
  normaliseGstin,
  organisationFieldsForGstin,
  panOf,
  stateOf,
} from "./gstin";

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

describe("gstinLabel (founder QC, 17 Nov 2026)", () => {
  it("adds the state from the first two digits, and is empty for none", () => {
    expect(gstinLabel("27AAKCG5521M1Z9")).toBe("27AAKCG5521M1Z9 · Maharashtra");
    expect(gstinLabel(null)).toBe("");
    expect(gstinLabel("00AAKCG5521M1Z9")).toBe("00AAKCG5521M1Z9");
  });
});

describe("organisationFieldsForGstin (a GSTIN added after Join)", () => {
  const empty = { state: null, pan: null, legalName: "Greenfield Energy", registeredAddress: null };

  it("sets the state and PAN from the GSTIN for a company that joined without one", () => {
    expect(organisationFieldsForGstin(empty, "27AAKCG5521M1Z9")).toEqual({
      state: "Maharashtra",
      pan: "AAKCG5521M",
    });
  });

  it("fills the registered address from an Active portal record but keeps the name the company typed", () => {
    const record = { status: "Active", legalName: "GREENFIELD ENERGY PVT LTD", address: "Plot 4, MIDC, Pune" };
    expect(organisationFieldsForGstin(empty, "27AAKCG5521M1Z9", record)).toEqual({
      state: "Maharashtra",
      pan: "AAKCG5521M",
      registeredAddress: "Plot 4, MIDC, Pune",
    });
    expect(organisationFieldsForGstin({ ...empty, legalName: " " }, "27AAKCG5521M1Z9", record).legalName).toBe(
      "GREENFIELD ENERGY PVT LTD",
    );
  });

  it("takes nothing from a record that isn't Active, and changes nothing already right", () => {
    const record = { status: "Cancelled", legalName: "X", address: "Y" };
    const done = { state: "Maharashtra", pan: "AAKCG5521M", legalName: "G", registeredAddress: "Pune" };
    expect(organisationFieldsForGstin({ ...empty }, "27AAKCG5521M1Z9", record)).not.toHaveProperty("registeredAddress");
    expect(organisationFieldsForGstin(done, "27AAKCG5521M1Z9", { ...record, status: "Active" })).toEqual({});
  });

  it("moves the state when a GSTIN is replaced by one from another state", () => {
    const done = { state: "Maharashtra", pan: "AAKCG5521M", legalName: "G", registeredAddress: "Pune" };
    expect(organisationFieldsForGstin(done, "29AAKCG5521M1Z5")).toEqual({ state: "Karnataka" });
  });
});
