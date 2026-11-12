import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { Queue, Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { redisConnection } from "../companies/jobs";
import { recordFailedJob, listDeadLetters } from "../queue/dead-letters";
import { runScheduled, SCHEDULES } from "../queue/schedule";
import { setSetting } from "../settings";
import { makeUser, twoCompanies, useTestEnv } from "../testing/factory";
import {
  CLOCK_SETTINGS,
  completeDeadline,
  onDeadline,
  removeHoliday,
  runDeadlines,
  setHoliday,
  slaColour,
  startClock,
  workingCalendar,
} from "./clocks";

// Step 3.8 DONE WHEN: a 48-hour deadline fires once at the right minute after a worker restart; working-day maths
// skips weekends and listed holidays (calendar.test.ts, and here with the seeded list); failed jobs appear in a
// dead-letter list with the error.
const url = process.env.TEST_DATABASE_URL;
const ist = (s: string) => new Date(`${s}+05:30`);
const minutes = (n: number) => n * 60_000;

describe.skipIf(!url)("clocks", () => {
  let h: DbHandle;
  let data: Awaited<ReturnType<typeof twoCompanies>>;
  const superAdmin = async () => {
    const person = await makeUser(h.db, "Clocks Super");
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Super admin")));
    await h.db.insert(schema.operatorRoles).values({ userId: person.id, roleId: r?.id ?? "" });
    return loadActor(h.db, person.id);
  };

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    data = await twoCompanies(h.db);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("fires a 48-hour deadline once, at the right minute, even after a restart", async () => {
    const events: string[] = [];
    onDeadline("supplierAcceptsOrder", (_tx, row, event) => {
      events.push(`${row.subjectId}:${event}`);
      return Promise.resolve();
    });
    const orderId = `ORD-TEST-${String(Date.now())}`;
    const start = ist("2026-11-12T10:15");
    const deadline = await startClock(h.db, {
      clock: "supplierAcceptsOrder",
      warn: { hours: 24 },
      subjectType: "order",
      subjectId: orderId,
      from: start,
    });
    expect(deadline.dueAt).toEqual(ist("2026-11-14T10:15"));
    expect(deadline.warnAt).toEqual(ist("2026-11-13T10:15"));

    // Registering again while open keeps the first deadline.
    const again = await startClock(h.db, { clock: "supplierAcceptsOrder", subjectType: "order", subjectId: orderId });
    expect(again.id).toBe(deadline.id);

    await runDeadlines(h.db, new Date(deadline.dueAt.getTime() - minutes(24 * 60) - minutes(1)));
    expect(events).toEqual([]);
    await runDeadlines(h.db, ist("2026-11-13T10:15"));
    expect(events).toEqual([`${orderId}:warn`]);

    // The worker stops; nothing runs for a while; the handler is registered again by the new process.
    onDeadline("supplierAcceptsOrder", (_tx, row, event) => {
      events.push(`${row.subjectId}:${event}`);
      return Promise.resolve();
    });
    await runDeadlines(h.db, new Date(deadline.dueAt.getTime() - minutes(1)));
    expect(events).toEqual([`${orderId}:warn`]);
    await runDeadlines(h.db, deadline.dueAt);
    await runDeadlines(h.db, new Date(deadline.dueAt.getTime() + minutes(1)));
    await Promise.all([runDeadlines(h.db, deadline.dueAt), runDeadlines(h.db, deadline.dueAt)]);
    expect(events).toEqual([`${orderId}:warn`, `${orderId}:expire`]);
    const [row] = await h.db.select().from(schema.deadlines).where(eq(schema.deadlines.id, deadline.id));
    expect(row?.expiredAt).toEqual(deadline.dueAt);
  });

  it("retries an event whose handler failed, and stops once the deadline is done", async () => {
    let fail = true;
    const seen: string[] = [];
    onDeadline("rfqModeration", (_tx, row, event) => {
      if (fail) return Promise.reject(new Error("mail server down"));
      seen.push(`${row.subjectId}:${event}`);
      return Promise.resolve();
    });
    const rfq = await startClock(h.db, {
      clock: "rfqModeration",
      subjectType: "rfq",
      subjectId: `RFQ-${String(Date.now())}`,
      from: ist("2026-11-14T11:00"), // Saturday
    });
    expect(rfq.dueAt).toEqual(ist("2026-11-16T11:00")); // Monday: Sunday skipped
    expect((await runDeadlines(h.db, rfq.dueAt)).failed).toBe(1);
    fail = false;
    expect((await runDeadlines(h.db, rfq.dueAt)).expired).toBe(1);
    expect(seen).toEqual([`${rfq.subjectId}:expire`]);

    const done = await startClock(h.db, {
      clock: "rfqModeration",
      subjectType: "rfq",
      subjectId: `RFQ-DONE-${String(Date.now())}`,
      from: ist("2026-11-14T11:00"),
    });
    await completeDeadline(h.db, { type: "rfqModeration", subjectType: "rfq", subjectId: done.subjectId });
    await runDeadlines(h.db, done.dueAt);
    expect(seen).toEqual([`${rfq.subjectId}:expire`]);
  });

  it("skips the seeded holidays, and a Super admin keeps the list", async () => {
    const calendar = await workingCalendar(h.db, { fresh: true });
    expect(calendar.isWorkingDay("2026-11-24")).toBe(false); // Guru Nanak's Birthday (seeded)
    expect(calendar.isWorkingDay("2027-10-29")).toBe(false); // Diwali 2027
    // Buyer accepts a delivery: 5 working days from Monday 23 Nov → Monday 30 Nov (24 Nov and Sunday off).
    const delivery = await startClock(h.db, {
      clock: "buyerAcceptsDelivery",
      subjectType: "order",
      subjectId: `ORD-DEL-${String(Date.now())}`,
      from: ist("2026-11-23T15:00"),
    });
    expect(delivery.dueAt).toEqual(ist("2026-11-30T15:00"));

    const admin = await loadActor(h.db, data.a.admin.id);
    await expect(setHoliday(h.db, admin, { day: "2026-12-31", name: "Test" })).rejects.toThrow("Not allowed");
    const boss = await superAdmin();
    await setHoliday(h.db, boss, { day: "2026-12-31", name: "Company holiday" });
    expect((await workingCalendar(h.db)).isWorkingDay("2026-12-31")).toBe(false);
    const [entry] = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "holiday.set"), eq(auditLog.resourceId, "2026-12-31")));
    expect(entry?.after).toEqual({ name: "Company holiday" });
    await removeHoliday(h.db, boss, "2026-12-31");
    expect((await workingCalendar(h.db)).isWorkingDay("2026-12-31")).toBe(true);
  });

  it("applies a changed clock to new deadlines only", async () => {
    const boss = await superAdmin();
    const before = await startClock(h.db, {
      clock: "supplierReview",
      subjectType: "supplier",
      subjectId: `SUP-A-${String(Date.now())}`,
      from: ist("2026-11-16T10:00"),
    });
    await setSetting(h.db, boss, CLOCK_SETTINGS.supplierReview, { workingDays: 3 });
    const after = await startClock(h.db, {
      clock: "supplierReview",
      subjectType: "supplier",
      subjectId: `SUP-B-${String(Date.now())}`,
      from: ist("2026-11-16T10:00"),
    });
    await setSetting(h.db, boss, CLOCK_SETTINGS.supplierReview, { workingDays: 2 });
    expect(before.dueAt).toEqual(ist("2026-11-18T10:00"));
    expect(after.dueAt).toEqual(ist("2026-11-19T10:00"));
    const [stored] = await h.db.select().from(schema.deadlines).where(eq(schema.deadlines.id, before.id));
    expect(stored?.dueAt).toEqual(ist("2026-11-18T10:00"));
  });

  it("colours queue items amber after 24 hours and red after 48", async () => {
    const start = ist("2026-11-12T09:00");
    expect(await slaColour(h.db, start, ist("2026-11-13T08:59"))).toBe("green");
    expect(await slaColour(h.db, start, ist("2026-11-13T09:00"))).toBe("amber");
    expect(await slaColour(h.db, start, ist("2026-11-14T09:00"))).toBe("red");
  });

  it("puts a job that failed every retry on the dead-letter list with its error", async () => {
    const name = `test-dlq-${String(Date.now())}`;
    const connection = redisConnection();
    const q = new Queue(name, { connection });
    const worker = new Worker(
      name,
      () => {
        throw new Error("GST portal said 503");
      },
      { connection },
    );
    const recorded = new Promise<void>((resolve) => {
      worker.on("failed", (job, error) => {
        void recordFailedJob(name, job, error).then((final) => {
          if (final) resolve();
        });
      });
    });
    await q.add(
      "check",
      { gstin: "27AAKCT0000A1Z5", otp: "123456" },
      { attempts: 2, backoff: { type: "fixed", delay: 10 } },
    );
    await recorded;
    await worker.close();
    await q.obliterate({ force: true });
    await q.close();

    const boss = await superAdmin();
    const list = await listDeadLetters(h.db, boss);
    const letter = list.find((x) => x.queue === name);
    expect(letter).toMatchObject({ jobName: "check", error: "GST portal said 503", attempts: 2 });
    expect(letter?.data).toEqual({ gstin: "27AAKCT0000A1Z5", otp: "••••" });
    await expect(listDeadLetters(h.db, await loadActor(h.db, data.a.admin.id))).rejects.toThrow("Not allowed");
  });

  it("runs every scheduled housekeeping job", async () => {
    // cms-publish-due calls the web app, which the end-to-end tests cover.
    for (const s of SCHEDULES.filter((x) => x.id !== "cms-publish-due")) await runScheduled(s.id);
    await expect(runScheduled("nope")).rejects.toThrow("No schedule");
  });
});
