import { describe, expect, it } from "vitest";
import { ADMIN_ONLY, applyChanges, defaultPermissions, GRANTABLE } from "./company-roles";

// Founder QC, 17 Nov 2026: a company's own permission ticks, applied over the catalogue's defaults.
describe("company role permissions", () => {
  it("adds and removes a company's changes over the defaults", () => {
    const base = defaultPermissions("supplier", "Sales");
    expect(base.has("quote.send")).toBe(true);
    const now = applyChanges(base, [
      { permissionKey: "product.manage", granted: true },
      { permissionKey: "quote.send", granted: false },
    ]);
    expect(now.has("product.manage")).toBe(true);
    expect(now.has("quote.send")).toBe(false);
  });

  it("never grants an admin-only permission, even if a row says so", () => {
    for (const p of ADMIN_ONLY) {
      expect(applyChanges(new Set(), [{ permissionKey: p, granted: true }]).has(p)).toBe(false);
      expect(GRANTABLE.buyer).not.toContain(p);
      expect(GRANTABLE.supplier).not.toContain(p);
    }
  });
});
