import { describe, expect, it } from "vitest";
import { accessPresets, MemberAccessError, storedAccess } from "./member-access";

// Founder QC (17 Nov 2026): each member's access is ticked per person; presets tick boxes.
describe("member access", () => {
  it("stores full access as Admin with no list", () => {
    expect(storedAccess("supplier", { admin: true, permissions: ["rfq.view"] })).toEqual({
      role: "Admin",
      permissions: null,
    });
  });

  it("names a preset when the ticks match it, otherwise Custom", () => {
    const sales = accessPresets("supplier").find((p) => p.name === "Sales");
    expect(sales).toBeDefined();
    expect(storedAccess("supplier", { admin: false, permissions: [...(sales?.permissions ?? [])].reverse() })).toEqual({
      role: "Sales",
      permissions: sales?.permissions,
    });
    const custom = storedAccess("supplier", {
      admin: false,
      permissions: [...(sales?.permissions ?? []), "storefront.manage"],
    });
    expect(custom.role).toBe("Custom");
    expect(custom.permissions).toContain("storefront.manage");
  });

  it("refuses admin-only permissions, unknown ones and an empty list", () => {
    expect(() => storedAccess("supplier", { admin: false, permissions: ["team.manage"] })).toThrow(MemberAccessError);
    expect(() => storedAccess("buyer", { admin: false, permissions: ["product.manage"] })).toThrow(
      "Choose from the list",
    );
    expect(() => storedAccess("buyer", { admin: false, permissions: [] })).toThrow("Tick at least one");
  });
});
