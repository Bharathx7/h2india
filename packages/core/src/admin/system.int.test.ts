import { isEnabled, setFlagOverrides } from "@h2india/config";
import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { startClock } from "../clocks/clocks";
import { recordFailedJob, resolveDeadLetter } from "../queue/dead-letters";
import { recordStepUp } from "../sign-in/step-up";
import { makeUser, useTestEnv } from "../testing/factory";
import {
  decideProposal,
  openProposals,
  reportsOverview,
  rollUpReports,
  setClock,
  switchFlag,
  SystemError,
  systemHealth,
} from "./system";

// Step 11.8 DONE WHEN: changing a clock changes behaviour for new deadlines only; a failed job appears in the health
// panel and can be retried; turning maintenance on takes effect (the proxy reads switches every 30 seconds).
const url = process.env.TEST_DATABASE_URL;
const redis = process.env.REDIS_URL;

describe.skipIf(!url)("system settings and reports", () => {
  let h: DbHandle;
  let a: Actor;
  let b: Actor;
  async function superAdmin(name: string) {
    const u = await makeUser(h.db, name);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Super admin")));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    return loadActor(h.db, u.id);
  }
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await superAdmin("Admin A 11.8");
    b = await superAdmin("Admin B 11.8");
  });
  afterAll(async () => {
    setFlagOverrides({});
    await h.pool.end();
  });

  it("a clock change applies to new deadlines only", async () => {
    const from = new Date("2026-11-16T04:30:00Z"); // Monday 10:00 IST
    const before = await startClock(h.db, {
      clock: "supplierAcceptsOrder",
      subjectType: "test",
      subjectId: "clock-1",
      from,
    });
    await setClock(h.db, a, "supplierAcceptsOrder", { hours: 24 }, "Testing a shorter acceptance window");
    const after = await startClock(h.db, {
      clock: "supplierAcceptsOrder",
      subjectType: "test",
      subjectId: "clock-2",
      from,
    });
    expect(after.dueAt.getTime() - from.getTime()).toBe(24 * 3_600_000);
    const [kept] = await h.db.select().from(schema.deadlines).where(eq(schema.deadlines.id, before.id));
    expect(kept?.dueAt.getTime()).toBe(before.dueAt.getTime());
    await setClock(h.db, a, "supplierAcceptsOrder", { hours: 48 }, "Back to the drawn value");
  });

  it("maintenance switches at once; transactions need a second operator", async () => {
    expect(await switchFlag(h.db, a, { flag: "maintenance", on: true, reason: "Database upgrade" })).toBe("applied");
    expect(isEnabled("maintenance")).toBe(true);
    await switchFlag(h.db, a, { flag: "maintenance", on: false, reason: "Upgrade done" });
    expect(isEnabled("maintenance")).toBe(false);

    expect(await switchFlag(h.db, a, { flag: "transactions", on: true, reason: "Pilot group ready" })).toBe("proposed");
    expect(isEnabled("transactions")).toBe(false);
    const [p] = await openProposals(h.db, a);
    await expect(decideProposal(h.db, a, p?.p.id ?? "", true)).rejects.toBeInstanceOf(SystemError);
    await decideProposal(h.db, b, p?.p.id ?? "", false);
    expect(isEnabled("transactions")).toBe(false);
  });

  it("a Super admin approves their own money switch after Confirm it's you (founder, 20 Nov 2026)", async () => {
    // Proposing "off" (it is already off) so no other test sees the shop open.
    expect(await switchFlag(h.db, a, { flag: "transactions", on: false, reason: "Keep it shut" })).toBe("proposed");
    const own = (await openProposals(h.db, a)).find((x) => x.p.proposedBy === a.userId);
    await expect(decideProposal(h.db, a, own?.p.id ?? "", true)).rejects.toThrow("Confirm it's you");
    await recordStepUp(h.db, a.userId ?? "");
    await decideProposal(h.db, a, own?.p.id ?? "", true);
    expect(isEnabled("transactions")).toBe(false);
    expect((await openProposals(h.db, a)).some((x) => x.p.id === own?.p.id)).toBe(false);
  });

  it.skipIf(!redis)("a failed job shows in the health panel and can be retried", async () => {
    await recordFailedJob(
      "notify",
      { name: "send", id: "j-11-8", data: { to: "x" }, attemptsMade: 3, opts: { attempts: 3 } },
      new Error("SMTP down"),
    );
    const health = await systemHealth(h.db, a);
    const row = health.failed.find((f) => f.jobId === "j-11-8");
    expect(row?.error).toBe("SMTP down");
    await resolveDeadLetter(h.db, a, { id: row?.id ?? "", resolution: "Retried" });
    expect((await systemHealth(h.db, a)).failed.some((f) => f.jobId === "j-11-8")).toBe(false);
  });

  it("reports come from the nightly roll-ups", async () => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
      new Date(Date.now() - 86_400_000),
    );
    await makeUser(h.db, "Counted yesterday");
    const values = await rollUpReports(h.db, day);
    expect(values.new_users).toBeGreaterThanOrEqual(0);
    const overview = await reportsOverview(h.db, a, 30);
    expect(overview.find((m) => m.key === "new_users")?.series.some((s) => s.day === day)).toBe(true);
  });
});
