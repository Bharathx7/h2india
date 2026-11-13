import { describe, expect, it } from "vitest";
import { actionWords, ago, deviceOf, maskMobile } from "./words";

describe("Users screen words", () => {
  it("turns audit actions into plain words", () => {
    expect(actionWords("rfq.deadline.extended")).toBe("RFQ deadline extended");
    expect(actionWords("view_as.started")).toBe("View as started");
  });
  it("names devices and times", () => {
    expect(
      deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"),
    ).toBe("Chrome on macOS");
    expect(deviceOf(null)).toBe("Unknown device");
    const now = new Date("2026-11-13T10:00:00Z");
    expect(ago(new Date("2026-11-13T08:00:00Z"), now)).toBe("2 h ago");
    expect(ago(new Date("2026-11-10T10:00:00Z"), now)).toBe("3 days ago");
  });
  it("never shows a whole mobile number", () => {
    expect(maskMobile("+919876543210")).toBe("+9198•• ••• 210");
  });
});

import { oldToNew } from "./changes";

describe("old → new in the audit log", () => {
  it("prefers the status, then the first changed field", () => {
    expect(oldToNew({ status: "Pending" }, { status: "Rejected" })).toBe("Pending → Rejected");
    expect(oldToNew({ offerDeadline: "a" }, { offerDeadline: "b" })).toBe("Offer deadline: a → b");
    expect(oldToNew(null, null)).toBe("—");
    expect(oldToNew(null, { until: "x" })).toBe("Until: none → x");
  });
});
