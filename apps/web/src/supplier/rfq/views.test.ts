import { describe, expect, it } from "vitest";
import { dueBadge, inboxTab, quoteBadge, type InboxFacts } from "./views";

const now = new Date("2026-11-10T06:30:00Z"); // 10 Nov, 12:00 IST
const base: InboxFacts = {
  rfqStatus: "Sent",
  recipient: "Sent",
  quoteStatus: null,
  sentVersion: null,
  offerDeadline: new Date("2026-11-13T12:30:00Z"),
  validUntil: null,
};

describe("supplier RFQ inbox (615:8)", () => {
  it("puts each RFQ in its tab", () => {
    expect(inboxTab(base)).toBe("quote");
    expect(inboxTab({ ...base, quoteStatus: "Draft" })).toBe("quote");
    expect(inboxTab({ ...base, quoteStatus: "Sent", sentVersion: 1 })).toBe("quoted");
    expect(inboxTab({ ...base, quoteStatus: "Accepted", sentVersion: 1, rfqStatus: "Closed" })).toBe("accepted");
    expect(inboxTab({ ...base, quoteStatus: "Not selected", sentVersion: 1, rfqStatus: "Closed" })).toBe("closed");
    expect(inboxTab({ ...base, recipient: "Declined" })).toBe("closed");
  });

  it("shows the Your quote badge as drawn", () => {
    expect(quoteBadge(base, now).label).toBe("Not started");
    expect(quoteBadge({ ...base, quoteStatus: "Draft" }, now).label).toBe("Draft");
    expect(
      quoteBadge({ ...base, quoteStatus: "Sent", sentVersion: 1, validUntil: new Date("2026-11-30T12:30:00Z") }, now)
        .label,
    ).toBe("Sent");
    expect(
      quoteBadge(
        { ...base, quoteStatus: "Revised", sentVersion: 2, validUntil: new Date("2026-11-13T12:30:00Z") },
        now,
      ),
    ).toEqual({ label: "Expires in 3 days", tone: "warning" });
    expect(quoteBadge({ ...base, quoteStatus: "Not selected", sentVersion: 1 }, now).label).toBe("Not selected");
  });

  it("counts down to the offer deadline", () => {
    expect(dueBadge(new Date("2026-11-10T11:30:00Z"), now)).toEqual({ label: "Due in 5 h", tone: "warning" });
    expect(dueBadge(new Date("2026-11-12T12:30:00Z"), now)?.label).toBe("2 days left");
    expect(dueBadge(new Date("2026-11-09T12:30:00Z"), now)).toBeNull();
  });
});
