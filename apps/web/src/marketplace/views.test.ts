import { describe, expect, it } from "vitest";
import type { PublicCatalogue } from "@h2india/core/catalogue/taxonomy";
import { applicationHref, categoryHref, classTileLine, popularCategories, productsLine } from "./views";

const cat = (slug: string, classId: "systems" | "components" = "systems") => ({
  id: slug,
  slug,
  label: slug,
  description: null,
  classId,
  parentId: null,
  liveProducts: 0,
  children: [],
  applicationIds: [],
});

describe("marketplace words and addresses", () => {
  it("builds the addresses", () => {
    expect(categoryHref(cat("electrolysers"))).toBe("/marketplace/systems/electrolysers");
    expect(categoryHref(cat("pem"), cat("electrolysers"))).toBe("/marketplace/systems/electrolysers/pem");
    expect(applicationHref("refuelling-mobility")).toBe("/marketplace/applications/refuelling-mobility");
  });

  it("leaves product counts out until there are listings", () => {
    expect(productsLine(0)).toBeUndefined();
    expect(productsLine(1)).toBe("1 product");
    expect(productsLine(1860)).toBe("1,860 products");
    expect(productsLine(318, "listings")).toBe("318 listings");
    const systems = {
      id: "systems" as const,
      label: "Systems",
      description: "",
      liveProducts: 0,
      categories: [cat("a"), cat("b")],
    };
    expect(classTileLine(systems)).toBe("2 categories");
    expect(classTileLine({ ...systems, liveProducts: 412 })).toBe("412 products · 2 categories");
    expect(classTileLine({ ...systems, id: "services", liveProducts: 318 })).toBe("318 listings · 2 categories");
  });

  it("keeps the drawn order of popular categories and skips hidden ones", () => {
    const catalogue: PublicCatalogue = {
      classes: [
        {
          id: "components",
          label: "Components",
          description: "",
          liveProducts: 0,
          categories: [cat("tanks-cylinders", "components")],
        },
        {
          id: "systems",
          label: "Systems",
          description: "",
          liveProducts: 0,
          categories: [cat("compression-systems"), cat("electrolysers")],
        },
      ],
      applications: [],
    };
    expect(popularCategories(catalogue).map((c) => c.slug)).toEqual([
      "electrolysers",
      "compression-systems",
      "tanks-cylinders",
    ]);
  });
});
