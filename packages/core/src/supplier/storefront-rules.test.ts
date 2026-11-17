import { describe, expect, it } from "vitest";
import { storefrontProblems, storefrontStepsDone } from "./storefront-rules";

describe("storefront rules (founder QC, 17 Nov 2026)", () => {
  const now = new Date("2026-11-17T00:00:00Z");

  it("checks the web address, email, phone, founded year and location cities", () => {
    expect(
      storefrontProblems(
        {
          website: "greenfieldh2.in",
          contactEmail: "sales@greenfieldh2.in",
          contactPhone: "+91 98765 43210",
          foundedYear: 2012,
          locations: [{ name: "Plant", city: "Pune", state: "Maharashtra", kind: "Factory" }],
        },
        now,
      ),
    ).toEqual({});
    const bad = storefrontProblems(
      {
        website: "not a site",
        contactEmail: "sales@",
        contactPhone: "12",
        foundedYear: 3020,
        locations: [{ name: "Plant", city: " ", state: "", kind: "" }],
      },
      now,
    );
    expect(Object.keys(bad).sort()).toEqual(["contactEmail", "contactPhone", "foundedYear", "locations", "website"]);
  });

  it("marks a step done only when buyers would see something in it", () => {
    expect(storefrontStepsDone({ about: "We make electrolysers" })).toEqual({
      brand: false,
      capabilities: false,
      locations: false,
      contact: false,
    });
    expect(
      storefrontStepsDone({
        logoFileId: "f",
        about: "x",
        categories: ["Electrolysers"],
        locations: [{ name: "Plant", city: "Pune", state: "", kind: "" }],
        website: "a.in",
      }),
    ).toEqual({ brand: true, capabilities: true, locations: true, contact: true });
  });
});
