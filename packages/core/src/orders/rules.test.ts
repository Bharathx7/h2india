import { describe, expect, it } from "vitest";
import { balanceProblem } from "../ledger";
import { nextPayoutRun, rateCardOn, SAMPLE_RATE_CARD, settle, type RateCard } from "./fees";
import { milestonePlan } from "./records";
import {
  buyerMainAction,
  canMoveOrder,
  isOverdue,
  ORDER_STATUSES,
  orderBadge,
  orderTransitions,
  timelineStep,
  type OrderStatus,
} from "./transitions";

// Step 10.1 DONE WHEN: forbidden transitions fail; Overdue is derived. Step 10.6: every posting balances. Step 10.8:
// a 30/70 schedule adds up to the total to the paisa. Step 10.11: payout runs and the fee cap.

describe("order transitions (807:14435)", () => {
  it("allows exactly the playbook's moves", () => {
    expect(canMoveOrder("Awaiting approval", "Pending acceptance")).toBe(true);
    expect(canMoveOrder("Pending acceptance", "Accepted")).toBe(true);
    expect(canMoveOrder("Delivered", "Disputed")).toBe(true);
    expect(canMoveOrder("Accepted by buyer", "Closed")).toBe(true);
  });

  it.each([
    ["Awaiting approval", "Shipped"],
    ["Pending acceptance", "Shipped"],
    ["Shipped", "Cancelled"],
    ["Delivered", "Closed"],
    ["Closed", "Disputed"],
    ["Declined", "Accepted"],
    ["Cancelled", "Pending acceptance"],
  ] as [OrderStatus, OrderStatus][])("refuses %s → %s", (from, to) => {
    expect(canMoveOrder(from, to)).toBe(false);
  });

  it("final statuses have no moves", () => {
    for (const s of ["Closed", "Declined", "Cancelled"] as const) expect(orderTransitions[s]).toHaveLength(0);
  });

  it("every status has a timeline step and a buyer action", () => {
    for (const s of ORDER_STATUSES) {
      expect(timelineStep(s)).toBeGreaterThanOrEqual(1);
      expect(timelineStep(s)).toBeLessThanOrEqual(7);
      expect(buyerMainAction(s)).toBeTruthy();
    }
    expect(timelineStep("Shipped")).toBe(5);
    expect(timelineStep("Cancelled", "Ready to dispatch")).toBe(4);
  });

  it("Overdue is derived from clocks, never stored", () => {
    const now = new Date("2026-11-15T10:00:00Z");
    const past = new Date("2026-11-14T10:00:00Z");
    const future = new Date("2026-11-16T10:00:00Z");
    expect(isOverdue({ status: "Pending acceptance", acceptBy: past }, now)).toBe(true);
    expect(isOverdue({ status: "Pending acceptance", acceptBy: future }, now)).toBe(false);
    expect(isOverdue({ status: "Awaiting payment", paymentDueAt: past }, now)).toBe(true);
    expect(isOverdue({ status: "Ready to dispatch", dispatchBy: past }, now)).toBe(true);
    expect(isOverdue({ status: "Shipped", dispatchBy: past }, now)).toBe(false);
    expect(orderBadge({ status: "Pending acceptance", acceptBy: past }, now)).toEqual({
      label: "Overdue",
      tone: "error",
    });
  });
});

describe("milestones (10.8)", () => {
  it("a 30/70 schedule adds up to the total to the paisa", () => {
    const total = 939_280_001n;
    const plan = milestonePlan(total, [
      { percentBps: 3000, trigger: "On confirmation" },
      { percentBps: 7000, trigger: "Before dispatch" },
    ]);
    expect(plan).toHaveLength(2);
    expect(plan.reduce((t, m) => t + m.amountPaise, 0n)).toBe(total);
    expect(plan[0]?.label).toBe("30% on confirmation");
  });

  it("no schedule means one payment on confirmation", () => {
    const plan = milestonePlan(100n, []);
    expect(plan).toEqual([expect.objectContaining({ trigger: "On confirmation", amountPaise: 100n })]);
  });
});

describe("ledger postings (10.6)", () => {
  it("balanced postings pass; anything else is refused", () => {
    expect(
      balanceProblem([
        { account: "partner_cash", debit: 100n },
        { account: "held_for_acceptance", credit: 100n },
      ]),
    ).toBeNull();
    expect(
      balanceProblem([
        { account: "partner_cash", debit: 100n },
        { account: "held_for_acceptance", credit: 99n },
      ]),
    ).toMatch("don't match");
    expect(balanceProblem([{ account: "partner_cash", debit: 1n, credit: 1n }])).toMatch("debit or a credit");
    expect(
      balanceProblem([
        { account: "partner_cash", debit: -1n },
        { account: "held_for_acceptance", credit: -1n },
      ]),
    ).toMatch("negative");
  });
});

describe("fees, TCS, TDS (10.11; sample figures until M11)", () => {
  const card: RateCard = { ...SAMPLE_RATE_CARD };
  const acceptedAt = new Date("2026-11-15T06:00:00Z");

  it("3% of value before GST, 18% GST on the fee, TCS 0.5% and TDS 0.1% on value before GST", () => {
    const exGst = 10_00_000_00n; // ₹10,00,000
    const total = exGst + 1_80_000_00n;
    const s = settle({ card, releasedPaise: total, orderTotalPaise: total, orderExGstPaise: exGst, acceptedAt });
    expect(s.feePaise).toBe(30_000_00n);
    expect(s.gstOnFeePaise).toBe(5_400_00n);
    expect(s.tcsPaise).toBe(5_000_00n);
    expect(s.tdsPaise).toBe(1_000_00n);
    expect(s.netPaise).toBe(total - 30_000_00n - 5_400_00n - 5_000_00n - 1_000_00n);
  });

  it("caps the fee at ₹50,000 per order, across partial releases", () => {
    const exGst = 50_00_000_00n; // ₹50 lakh → 3% is ₹1.5 lakh
    const total = exGst;
    const half = settle({
      card,
      releasedPaise: total / 2n,
      orderTotalPaise: total,
      orderExGstPaise: exGst,
      acceptedAt,
    });
    expect(half.feePaise).toBe(50_000_00n);
    const rest = settle({
      card,
      releasedPaise: total / 2n,
      orderTotalPaise: total,
      orderExGstPaise: exGst,
      acceptedAt,
      feeSoFarPaise: half.feePaise,
    });
    expect(rest.feePaise).toBe(0n);
  });

  it("charges no fee during the launch offer", () => {
    const offer = { ...card, launchOfferFrom: "2026-11-01", launchOfferTo: "2027-06-30" };
    const s = settle({
      card: offer,
      releasedPaise: 100_00n,
      orderTotalPaise: 100_00n,
      orderExGstPaise: 100_00n,
      acceptedAt,
    });
    expect(s.launchOffer).toBe(true);
    expect(s.feePaise).toBe(0n);
    expect(s.gstOnFeePaise).toBe(0n);
  });

  it("uses the rate card in force on the day", () => {
    const v2 = { ...card, version: "2.0", effectiveFrom: "2027-01-01", feeBps: 250 };
    expect(rateCardOn([card, v2], new Date("2026-12-31T12:00:00Z"))?.version).toBe("1.0");
    expect(rateCardOn([card, v2], new Date("2027-01-01T00:00:00+05:30"))?.version).toBe("2.0");
  });

  it("payouts go in the next 11:00 or 16:00 IST run on a working day", () => {
    const working = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0 && d !== "2026-11-16";
    // Saturday 14 Nov 2026, 12:00 IST → 16:00 IST the same day.
    expect(nextPayoutRun(new Date("2026-11-14T06:30:00Z"), working).toISOString()).toBe("2026-11-14T10:30:00.000Z");
    // Saturday 17:00 IST → Sunday off, Monday 16 Nov a holiday → Tuesday 11:00 IST.
    expect(nextPayoutRun(new Date("2026-11-14T11:30:00Z"), working).toISOString()).toBe("2026-11-17T05:30:00.000Z");
  });
});
