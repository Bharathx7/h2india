import { describe, expect, it } from "vitest";
import { EMPTY_WIZARD, istDeadline, stepOneErrors, stepThreeErrors } from "./wizard-state";

const outlet = { key: "outlet", label: "Outlet pressure", type: "number", unit: "bar", min: 1, max: 1000 };

describe("RFQ wizard checks (399:10344)", () => {
  it("asks for the quantity and keeps specs in the schema's range", () => {
    const e = stepOneErrors(
      { ...EMPTY_WIZARD, categoryId: "c", title: "2 × diaphragm compressors", specs: { outlet: "1,200" } },
      [outlet],
    );
    expect(e.quantity).toBe("Enter a quantity");
    expect(e["spec.outlet"]).toBe("Outlet pressure must be 1–1,000 bar");
    expect(Object.keys(e)).toHaveLength(2);
  });

  it("passes a complete step 1", () => {
    expect(
      stepOneErrors(
        { ...EMPTY_WIZARD, categoryId: "c", title: "Compressors", quantity: "2", specs: { outlet: "350" } },
        [outlet],
      ),
    ).toEqual({});
    expect(stepOneErrors({ ...EMPTY_WIZARD, categoryId: "c", title: "x", quantity: "1.5" }, []).quantity).toBe(
      "Enter a whole number above 0",
    );
  });

  it("needs a site and GSTIN only when signed in, and dates in order", () => {
    const base = { ...EMPTY_WIZARD, deliveryState: "Gujarat", requiredBy: "2027-04-30", offerDeadline: "2026-11-28" };
    expect(stepThreeErrors(base, false, "2026-11-13")).toEqual({});
    expect(Object.keys(stepThreeErrors(base, true, "2026-11-13")).sort()).toEqual(["gstinId", "siteId"]);
    expect(stepThreeErrors({ ...base, offerDeadline: "2026-11-13" }, false, "2026-11-13").offerDeadline).toBe(
      "The offer deadline must be after today",
    );
    expect(stepThreeErrors({ ...base, requiredBy: "2026-11-20" }, false, "2026-11-13").requiredBy).toBe(
      "The required date must be after the offer deadline",
    );
  });

  it("puts the offer deadline at 6:00 PM in India", () => {
    expect(istDeadline("2026-11-28").toISOString()).toBe("2026-11-28T12:30:00.000Z");
  });
});
