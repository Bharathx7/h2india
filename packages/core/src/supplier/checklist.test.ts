import { describe, expect, it } from "vitest";
import { buildChecklist, canSubmitForReview, type SupplierFacts } from "./checklist";

const base: SupplierFacts = {
  gstin: null,
  companyComplete: false,
  documents: { uploaded: 0, verified: 0, needed: 2 },
  bank: null,
  storefront: null,
  products: { total: 0, submitted: 0 },
  review: "none",
};

describe("onboarding checklist (584:8)", () => {
  it("reads every step from records", () => {
    const empty = buildChecklist(base);
    expect(empty.done).toBe(0);
    expect(empty.items.map((i) => i.title)).toEqual([
      "Company details and GSTIN",
      "Bank account",
      "Storefront basics",
      "First product or datasheet",
      "Submit for review",
    ]);
    const c = buildChecklist({
      ...base,
      gstin: { number: "33AAJCP7712L1Z4", status: "Pending" },
      companyComplete: true,
      documents: { uploaded: 2, verified: 0, needed: 2 },
      bank: { last4: "4417", nameMatches: true, verified: true },
      storefront: { hasLogo: true, hasAbout: true, locations: 2, published: true },
    });
    expect(c.items[0]).toMatchObject({
      state: "checking",
      badge: "Being checked",
      detail: "33AAJCP7712L1Z4 · checking in the background",
    });
    expect(c.items[1]).toMatchObject({
      state: "done",
      detail: "Account ending 4417 · name matches your GST legal name",
    });
    expect(c.items[2]?.detail).toBe("Logo, about and 2 manufacturing locations added");
    expect(c.done).toBe(2);
    expect(canSubmitForReview(c)).toBe(false);
    const ready = buildChecklist({
      ...base,
      gstin: { number: "x", status: "Active" },
      companyComplete: true,
      documents: { uploaded: 2, verified: 2, needed: 2 },
      bank: { last4: "1", nameMatches: true, verified: true },
      storefront: { hasLogo: true, hasAbout: true, locations: 0, published: true },
      products: { total: 1, submitted: 0 },
    });
    expect(canSubmitForReview(ready)).toBe(true);
    expect(buildChecklist({ ...base, review: "approved" }).items[4]?.state).toBe("done");
  });
});
