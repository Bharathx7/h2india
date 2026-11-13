import { describe, expect, it } from "vitest";
import { buildBuyerChecklist, type BuyerFacts } from "./checklist";

const none: BuyerFacts = { gstin: null, site: null, people: 1, invited: 0, rules: false, rfqs: 0 };

describe("buyer checklist (553:8)", () => {
  it("starts with nothing done", () => {
    const c = buildBuyerChecklist(none);
    expect(c.done).toBe(0);
    expect(c.total).toBe(5);
    expect(c.complete).toBe(false);
  });
  it("shows a GSTIN being checked, then verified", () => {
    const checking = buildBuyerChecklist({
      ...none,
      gstin: { number: "27AAKCG5521M1Z9", status: "Pending", checkedAt: null },
    });
    expect(checking.items[0]?.badge).toBe("Checking");
    expect(checking.items[0]?.state).toBe("todo");
    const verified = buildBuyerChecklist({
      ...none,
      gstin: { number: "27AAKCG5521M1Z9", status: "Active", checkedAt: new Date("2026-11-04T06:00:00Z") },
    });
    expect(verified.items[0]?.state).toBe("done");
    expect(verified.items[0]?.badge).toBe("GST verified");
  });
  it("is complete when all five are done", () => {
    const c = buildBuyerChecklist({
      gstin: { number: "27AAKCG5521M1Z9", status: "Active", checkedAt: null },
      site: { name: "Talegaon plant", city: "Pune", contact: "Suresh Patil" },
      people: 2,
      invited: 0,
      rules: true,
      rfqs: 1,
    });
    expect(c.complete).toBe(true);
  });
});
