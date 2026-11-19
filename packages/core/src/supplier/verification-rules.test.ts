import { describe, expect, it } from "vitest";
import { deskChecksProblem, deskEvidence, MIN_DESK_CHECKS, tickedDeskChecks } from "./verification-rules";

describe("the desk checklist (founder, 19 Nov 2026)", () => {
  it("needs at least two of the five checks to approve", () => {
    expect(MIN_DESK_CHECKS).toBe(2);
    expect(deskChecksProblem({})).toBe("Tick at least 2 checks");
    expect(deskChecksProblem({ identity: true })).toBe("Tick at least 2 checks");
    expect(deskChecksProblem({ identity: true, bank: false })).toBe("Tick at least 2 checks");
    expect(deskChecksProblem({ identity: true, bank: true })).toBeNull();
  });

  it("pre-ticks identity and bank from the records, and says what is missing", () => {
    const now = new Date("2026-11-19T00:00:00Z");
    const later = new Date("2027-01-01T00:00:00Z");
    const none = deskEvidence([], [], now);
    expect(none.ticks).toEqual({ identity: false, bank: false });
    expect(none.tier1Missing).toEqual(["GST certificate", "PAN card"]);
    expect(none.waitingOn).toEqual([
      "GST certificate not uploaded",
      "PAN card not uploaded",
      "Payout bank account not confirmed",
    ]);

    const checking = deskEvidence(
      [
        { type: "gstin", status: "Submitted", expiresOn: later },
        { type: "pan", status: "Needs re-upload", expiresOn: null },
      ],
      [{ status: "Held", nameMatches: true }],
      now,
    );
    expect(checking.ticks).toEqual({ identity: false, bank: false });
    expect(checking.waitingOn).toEqual([
      "GST certificate uploaded, waiting for your check above",
      "PAN card needs a new upload",
      "Payout bank account not confirmed",
    ]);

    const proven = deskEvidence(
      [
        { type: "gstin", status: "Verified", expiresOn: later },
        { type: "pan", status: "Verified", expiresOn: null },
      ],
      [{ status: "Active", nameMatches: true }],
      now,
    );
    expect(proven.ticks).toEqual({ identity: true, bank: true });
    expect(proven.tier1Missing).toEqual([]);
    expect(proven.waitingOn).toEqual([]);

    // An expired GST certificate or a bank name that didn't match proves nothing.
    const stale = deskEvidence(
      [
        { type: "gstin", status: "Verified", expiresOn: new Date("2026-11-01T00:00:00Z") },
        { type: "pan", status: "Verified", expiresOn: null },
      ],
      [{ status: "Active", nameMatches: false }],
      now,
    );
    expect(stale.ticks).toEqual({ identity: false, bank: false });
    expect(stale.tier1Missing).toEqual(["GST certificate"]);
  });

  it("counts only the checklist's own checks", () => {
    expect(tickedDeskChecks({ identity: true, made_up: true, another: true })).toBe(1);
    expect(deskChecksProblem({ identity: true, made_up: true })).toBe("Tick at least 2 checks");
    expect(tickedDeskChecks({ identity: true, bank: true, signatory: true, site: true, certificates: true })).toBe(5);
  });
});
