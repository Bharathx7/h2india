import { describe, expect, it } from "vitest";
import type { OrderListItem } from "@h2india/core/orders";
import { milestoneWord, pipelineBadge, supplierNextStep } from "./views";

const now = new Date("2026-11-11T04:15:00Z"); // 11 Nov, 9:45 AM IST
const base: OrderListItem = {
  id: "1",
  reference: "ORD-2026-0090",
  status: "Pending acceptance",
  badge: { label: "Pending acceptance", tone: "progress" },
  overdue: false,
  buyerName: "Buyer",
  supplierName: "Supplier",
  itemSummary: "Hydrogen dryer HD-50 × 2",
  totalPaise: 16_22_800_00n,
  dueNowPaise: 0n,
  createdAt: now,
  dispatchBy: null,
  acceptBy: null,
  due: null,
  transporter: null,
  shippedAt: null,
  buyerAcceptBy: null,
  closedAt: null,
};

describe("supplier pipeline wording (810:12156)", () => {
  it("counts down the 48 hours, then says how late", () => {
    expect(supplierNextStep({ ...base, acceptBy: new Date(now.getTime() + 47 * 3_600_000) }, now).text).toBe(
      "Accept within 47 h",
    );
    const late = supplierNextStep({ ...base, acceptBy: new Date(now.getTime() - 3 * 3_600_000) }, now);
    expect(late).toEqual({ text: "Overdue by 3 h · accept or decline", urgent: true });
  });

  it("names the payment that is due", () => {
    const s = supplierNextStep(
      {
        ...base,
        status: "Awaiting payment",
        due: { label: "On confirmation", amountPaise: 32_47_800_00n, dueAt: new Date("2026-11-13T06:00:00Z") },
      },
      now,
    );
    expect(s.text).toBe("Advance ₹32,47,800 due 13 Nov");
    expect(milestoneWord("Before dispatch")).toBe("Balance");
  });

  it("shows the delivery deadline and the transporter", () => {
    expect(
      supplierNextStep({ ...base, status: "Delivered", buyerAcceptBy: new Date("2026-11-15T06:00:00Z") }, now).text,
    ).toBe("Buyer accepts by 15 Nov");
    expect(
      supplierNextStep(
        { ...base, status: "Shipped", shippedAt: new Date("2026-11-10T06:00:00Z"), transporter: "Gati KWE" },
        now,
      ).text,
    ).toBe("Shipped 10 Nov · Gati KWE");
  });

  it("turns an overdue Pending acceptance red", () => {
    expect(pipelineBadge({ ...base, overdue: true }).tone).toBe("error");
    expect(pipelineBadge(base).tone).toBe("progress");
  });
});
