import { describe, expect, it } from "vitest";
import { MemberAccessError, storedAccess } from "./member-access";

// Founder QC (17 Nov 2026): each member's access is ticked per person. A199 (21 Nov 2026): full access or Custom.
describe("member access", () => {
  it("stores full access as Admin with no list", () => {
    expect(storedAccess("supplier", { admin: true, permissions: ["rfq.view"] })).toEqual({
      role: "Admin",
      permissions: null,
    });
  });

  it("stores any limited access as Custom with the ticks in the form's order (A199: no presets)", () => {
    // These ticks used to match the old Sales preset; they are now Custom like any other choice.
    expect(storedAccess("supplier", { admin: false, permissions: ["order.manage", "quote.send", "rfq.view"] })).toEqual(
      {
        role: "Custom",
        permissions: ["rfq.view", "quote.send", "order.manage"],
      },
    );
  });

  it("refuses admin-only permissions, unknown ones and an empty list", () => {
    expect(() => storedAccess("supplier", { admin: false, permissions: ["team.manage"] })).toThrow(MemberAccessError);
    expect(() => storedAccess("buyer", { admin: false, permissions: ["product.manage"] })).toThrow(
      "Choose from the list",
    );
    expect(() => storedAccess("buyer", { admin: false, permissions: [] })).toThrow("Tick at least one");
  });
});
