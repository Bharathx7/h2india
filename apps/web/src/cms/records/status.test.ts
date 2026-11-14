import { describe, expect, it } from "vitest";
import { dueLabel, eventStatus, grantStatus, jobStatus, schemeStatus, tenderStatus } from "./status";

// Step 4.3 DONE WHEN: a tender's status changes from open to closed at its deadline without an editor.
const ist = (s: string) => new Date(`${s}+05:30`);

describe("record statuses from dates", () => {
  it("closes a tender at its deadline minute, IST", () => {
    const t = { bidDueAt: ist("2026-11-20T15:00").toISOString() };
    expect(tenderStatus(t, ist("2026-11-10T12:00"))).toBe("Open");
    expect(tenderStatus(t, ist("2026-11-14T12:00"))).toBe("Closing soon");
    expect(tenderStatus(t, ist("2026-11-20T14:59"))).toBe("Closing soon");
    // From the bid due minute it waits for the result (455:1621 "Under evaluation").
    expect(tenderStatus(t, ist("2026-11-20T15:00"))).toBe("Under evaluation");
    expect(
      tenderStatus({ ...t, result: { declaredAt: ist("2026-12-08T10:00").toISOString() } }, ist("2026-12-09T10:00")),
    ).toBe("Awarded");
  });

  it("shows upcoming and extended tenders", () => {
    const now = ist("2026-11-10T12:00");
    const due = ist("2026-11-21T17:00").toISOString();
    expect(tenderStatus({ bidDueAt: due, publishedAt: ist("2026-11-15T10:00").toISOString() }, now)).toBe("Upcoming");
    expect(tenderStatus({ bidDueAt: due, extendedFrom: ist("2026-11-11T17:00").toISOString() }, now)).toBe("Extended");
    // Closing soon wins over Extended (457:3222: extended from 5 Nov, badge Closing soon).
    expect(
      tenderStatus(
        { bidDueAt: ist("2026-11-15T15:00").toISOString(), extendedFrom: ist("2026-11-05T15:00").toISOString() },
        now,
      ),
    ).toBe("Closing soon");
  });

  it("announces grant calls until they close", () => {
    const now = ist("2026-11-12T10:00");
    expect(grantStatus({ deadline: ist("2027-01-31T17:00").toISOString(), override: "Announced" }, now)).toBe(
      "Announced",
    );
    expect(grantStatus({ deadline: ist("2026-11-01T17:00").toISOString(), override: "Announced" }, now)).toBe("Closed");
  });

  it("handles schemes, grants, jobs and events", () => {
    const now = ist("2026-11-12T10:00");
    expect(schemeStatus({}, now)).toBe("Open");
    expect(schemeStatus({ override: "Next round expected" }, now)).toBe("Next round expected");
    expect(grantStatus({ deadline: ist("2026-11-01T17:00").toISOString(), nextCallExpected: "Q3 2027" }, now)).toBe(
      "Next round expected",
    );
    expect(grantStatus({ deadline: ist("2026-11-30T17:00").toISOString() }, now)).toBe("Open");
    expect(jobStatus({ closesAt: ist("2026-11-12T09:59").toISOString() }, now)).toBe("Expired");
    expect(
      eventStatus(
        { startsAt: ist("2026-12-04T09:30").toISOString(), endsAt: ist("2026-12-04T17:30").toISOString() },
        now,
      ),
    ).toBe("Upcoming");
    expect(
      eventStatus(
        { startsAt: ist("2026-11-12T09:30").toISOString(), endsAt: ist("2026-11-12T17:30").toISOString() },
        now,
      ),
    ).toBe("Happening now");
  });

  it("writes the drawn due labels", () => {
    const now = ist("2026-11-11T15:00");
    expect(dueLabel("Bid due", ist("2026-11-20T15:00").toISOString(), now)).toBe("Bid due in 9 days");
    expect(dueLabel("Closes", ist("2026-11-11T18:00").toISOString(), now)).toBe("Closes today");
    expect(dueLabel("Closes", ist("2026-11-10T18:00").toISOString(), now)).toBeNull();
  });
});
