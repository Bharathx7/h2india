import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestEnv } from "../testing/factory";
import {
  claimReminder,
  readRegistrationToken,
  registerForWebinar,
  registrationToken,
  REMINDER_TYPE,
  seatsTaken,
  type WebinarFacts,
} from "./registrations";

// Step 5.7 DONE WHEN: a full webinar refuses registration; reminders are deadlines (one day and one hour before) that a
// worker restart can't lose or double-send.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("webinar registrations", () => {
  let h: DbHandle;
  const now = new Date("2026-11-12T06:30:00Z");
  const webinar = (over: Partial<WebinarFacts> = {}): WebinarFacts => ({
    id: 900_000 + Math.floor(Math.random() * 90_000),
    slug: "sizing-a-pem-electrolyser",
    startsAt: new Date("2026-12-09T09:30:00Z"),
    capacity: 1,
    open: true,
    sponsor: "Hydrotek Systems",
    ...over,
  });
  const person = (email: string, extra = {}) => ({
    name: "Ravi Kulkarni",
    email,
    organisation: "Greenfield Hydrogen",
    role: "",
    mobile: "",
    sponsorConsent: false,
    ...extra,
  });

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("gives the last seat once, then says full; a replay request still registers", async () => {
    const w = webinar();
    const first = await registerForWebinar(h.db, w, person("ravi@example.com", { sponsorConsent: true }), {
      member: false,
      now,
    });
    expect(first).toMatchObject({ ok: true, kind: "live", already: false });
    const second = await registerForWebinar(h.db, w, person("meera@example.com"), { member: false, now });
    expect(second).toEqual({ ok: false, reason: "full" });
    // The same person again gets their registration back, not a second seat.
    expect(await registerForWebinar(h.db, w, person("RAVI@example.com"), { member: false, now })).toMatchObject({
      ok: true,
      already: true,
    });
    expect(await seatsTaken(h.db, w.id)).toBe(1);
    const replay = await registerForWebinar(
      h.db,
      w,
      { ...person("meera@example.com"), name: "", organisation: "" },
      { member: false, wantReplay: true, now },
    );
    expect(replay).toMatchObject({ ok: true, kind: "replay" });
    const [row] = await h.db
      .select()
      .from(schema.webinarRegistrations)
      .where(
        and(eq(schema.webinarRegistrations.eventId, w.id), eq(schema.webinarRegistrations.email, "ravi@example.com")),
      );
    expect(row).toMatchObject({
      sponsorConsent: true,
      consentVersion: "webinar-sponsor-v1",
      consentText: "Share my name, work email and organisation with Hydrotek Systems, the sponsor",
    });
  });

  it("refuses closed webinars and checks the form", async () => {
    expect(
      await registerForWebinar(h.db, webinar({ open: false }), person("a@example.com"), { member: false, now }),
    ).toEqual({ ok: false, reason: "closed" });
    const bad = await registerForWebinar(h.db, webinar(), person("not-an-email", { mobile: "12345" }), {
      member: false,
      now,
    });
    expect(bad.ok ? null : bad).toMatchObject({
      reason: "invalid",
      errors: { email: "Enter your work email, like name@company.in", mobile: "Enter a 10-digit Indian mobile number" },
    });
  });

  it("starts one reminder deadline a day and an hour before, sent at most once each", async () => {
    const w = webinar({ capacity: null });
    const r = await registerForWebinar(h.db, w, person("hour@example.com", { mobile: "98765 43210" }), {
      member: false,
      now,
    });
    if (!r.ok) throw new Error("registration failed");
    expect(r.mobile).toBe("+919876543210");
    const [deadline] = await h.db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.type, REMINDER_TYPE), eq(schema.deadlines.subjectId, r.id)));
    expect(deadline?.dueAt.toISOString()).toBe("2026-12-09T08:30:00.000Z");
    expect(deadline?.warnAt?.toISOString()).toBe("2026-12-08T09:30:00.000Z");
    expect(await claimReminder(h.db, r.id, "hour")).toBe(true);
    expect(await claimReminder(h.db, r.id, "hour")).toBe(false);
    expect(await claimReminder(h.db, r.id, "day")).toBe(true);
  });

  it("signs join and replay links for one purpose each", () => {
    const token = registrationToken("0197b6f0-0000-7000-8000-000000000001", "join");
    expect(readRegistrationToken(token, "join")).toBe("0197b6f0-0000-7000-8000-000000000001");
    expect(readRegistrationToken(token, "replay")).toBeNull();
    expect(readRegistrationToken(`${token}x`, "join")).toBeNull();
  });
});
