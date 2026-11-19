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
      bank: { last4: "4417", nameMatches: true, status: "Active" },
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
      bank: { last4: "1", nameMatches: true, status: "Active" },
      storefront: { hasLogo: true, hasAbout: true, locations: 0, published: true },
      products: { total: 1, submitted: 0 },
    });
    expect(canSubmitForReview(ready)).toBe(true);
    expect(buildChecklist({ ...base, review: "approved" }).items[4]?.state).toBe("done");
  });

  it("counts a storefront sent for review as being checked, so a new supplier can submit", () => {
    const c = buildChecklist({
      ...base,
      gstin: { number: "x", status: "Pending" },
      companyComplete: true,
      documents: { uploaded: 2, verified: 0, needed: 2 },
      bank: { last4: "1", nameMatches: true, status: "Held" },
      storefront: { hasLogo: true, hasAbout: true, locations: 0, published: false },
      products: { total: 1, submitted: 1 },
    });
    expect(c.items[2]?.state).toBe("checking");
    expect(canSubmitForReview(c)).toBe(true);
  });

  it("links each company step to where it is done", () => {
    const none = buildChecklist(base).items[0];
    expect(none).toMatchObject({ state: "todo", action: { label: "Add GSTIN", href: "/supplier/company" } });
    expect(none?.detail).not.toMatch(/registered address and GSTIN/);
    const docs = buildChecklist({
      ...base,
      gstin: { number: "33AAJCP7712L1Z4", status: "Pending" },
      companyComplete: true,
      documents: { uploaded: 1, verified: 0, needed: 2 },
    }).items[0];
    expect(docs).toMatchObject({
      state: "todo",
      action: { label: "Upload documents", href: "/supplier/verification" },
    });
    const done = buildChecklist({
      ...base,
      gstin: { number: "x", status: "Active" },
      companyComplete: true,
      documents: { uploaded: 2, verified: 2, needed: 2 },
    }).items[0];
    expect(done?.state).toBe("done");
    expect(done?.action).toBeUndefined();
  });

  it("treats a bank account still waiting for its email code as to do, not being checked", () => {
    const ready = {
      ...base,
      gstin: { number: "x", status: "Active" },
      companyComplete: true,
      documents: { uploaded: 2, verified: 2, needed: 2 },
      storefront: { hasLogo: true, hasAbout: true, locations: 0, published: true },
      products: { total: 1, submitted: 0 },
    };
    const pending = buildChecklist({ ...ready, bank: { last4: "4417", nameMatches: true, status: "Pending" } });
    expect(pending.items[1]).toMatchObject({
      state: "todo",
      detail: "Account ending 4417 · finish confirming your account",
      action: { label: "Finish confirming", href: "/supplier/bank" },
    });
    expect(pending.items[1]?.badge).toBeUndefined();
    expect(canSubmitForReview(pending)).toBe(false);

    const held = buildChecklist({ ...ready, bank: { last4: "4417", nameMatches: true, status: "Held" } });
    expect(held.items[1]).toMatchObject({ state: "checking", action: { href: "/supplier/bank" } });
    expect(canSubmitForReview(held)).toBe(true);

    expect(
      buildChecklist({ ...ready, bank: { last4: "4417", nameMatches: true, status: "Active" } }).items[1]?.state,
    ).toBe("done");
  });

  it("lets a supplier submit again after H2 Economy asked for changes", () => {
    const c = buildChecklist({
      ...base,
      gstin: { number: "x", status: "Active" },
      companyComplete: true,
      documents: { uploaded: 2, verified: 2, needed: 2 },
      bank: { last4: "1", nameMatches: true, status: "Active" },
      storefront: { hasLogo: true, hasAbout: true, locations: 0, published: true },
      products: { total: 1, submitted: 1 },
      review: "changes",
    });
    expect(c.items[4]?.state).toBe("todo");
    expect(c.items[4]?.detail).toMatch(/asked for changes/);
    expect(canSubmitForReview(c)).toBe(true);
  });
});
