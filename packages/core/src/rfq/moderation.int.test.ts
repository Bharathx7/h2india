import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { workingCalendar } from "../clocks/clocks";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { moderationDetail, moderationQueue } from "./moderation";
import { approveRfq, assignModerator, createRfq, rejectRfq, returnRfq, submitRfq } from "./records";

// Step 9.4 DONE WHEN: the 1-working-day clock skips days that aren't working days (the playbook's "Friday evening is
// due on the next working day, not Saturday" assumes a Monday-to-Friday week; M18 set Monday to Saturday, so here a
// Saturday-evening RFQ is due on Monday, A165). Approving notifies every chosen supplier once each; returned RFQs
// reach the buyer with the reasons.
const url = process.env.TEST_DATABASE_URL;
const mailpit = process.env.MAILPIT_URL;
const DAY = 86_400_000;

describe.skipIf(!url)("RFQ moderation", () => {
  let h: DbHandle;
  let buyer: Awaited<ReturnType<typeof makeCompany>>;
  const suppliers: Awaited<ReturnType<typeof makeCompany>>[] = [];
  let moderator: Actor;
  let siteId = "";

  async function submitted(at = new Date()) {
    const admin = await loadActor(h.db, buyer.admin.id);
    const { id } = await createRfq(h.db, admin, buyer.org.id, {
      title: `Electrolysers × 10 ${String(Math.random()).slice(2, 7)}`,
      items: [{ description: "PEM electrolyser stack", quantity: 10, specs: { capacity: 250 } }],
      deliverySiteId: siteId,
      requiredBy: new Date(Date.now() + 90 * DAY),
      offerDeadline: new Date(Date.now() + 10 * DAY),
      supplierIds: suppliers.map((s) => s.org.id),
    });
    await submitRfq(h.db, admin, buyer.org.id, id, undefined, at);
    return id;
  }

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    buyer = await makeCompany(h.db, "Moderation buyer");
    for (const n of ["Mod supplier A", "Mod supplier B"]) {
      const c = await makeCompany(h.db, n, "supplier");
      await h.db
        .update(schema.organisations)
        .set({ verification: "Verified" })
        .where(eq(schema.organisations.id, c.org.id));
      suppliers.push(c);
    }
    const [site] = await h.db
      .insert(schema.deliverySites)
      .values({ organisationId: buyer.org.id, name: "Kandla", address: "Port Road", state: "Gujarat" })
      .returning();
    siteId = site?.id ?? "";
    const op = await makeUser(h.db, "RFQ moderator 9.4");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Operations")));
    if (!role) throw new Error("Operations role missing");
    await h.db.insert(schema.operatorRoles).values({ userId: op.id, roleId: role.id });
    moderator = await loadActor(h.db, op.id);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("the 1-working-day clock skips Sunday and holidays", async () => {
    const calendar = await workingCalendar(h.db);
    // Saturday 14 Nov 2026, 7 PM IST → due Monday 16 Nov, 7 PM IST (Sunday isn't a working day, M18).
    const due = calendar.add(new Date("2026-11-14T13:30:00Z"), { workingDays: 1 });
    expect(due.toISOString()).toBe("2026-11-16T13:30:00.000Z");
    const id = await submitted(new Date("2026-11-14T13:30:00Z"));
    const [deadline] = await h.db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.subjectId, id), eq(schema.deadlines.type, "rfqModeration")));
    expect(deadline?.dueAt.toISOString()).toBe("2026-11-16T13:30:00.000Z");
  });

  it("queues RFQs with their checks, assigns and approves; each supplier is told once", async () => {
    const id = await submitted();
    const queue = await moderationQueue(h.db, moderator);
    const row = queue.find((x) => x.rfq.id === id);
    expect(row?.checks.find((c) => c.key === "site")?.ok).toBe(true);
    expect(row?.checks.find((c) => c.key === "spec")?.ok).toBe(true);
    await assignModerator(h.db, moderator, id, moderator.userId);
    expect((await moderationQueue(h.db, moderator, { view: "mine" })).some((x) => x.rfq.id === id)).toBe(true);
    await approveRfq(h.db, moderator, id);
    // A second approval is refused: the RFQ moved on, so nobody is told twice.
    await expect(approveRfq(h.db, moderator, id)).rejects.toThrow();
    const inApp = await h.db.select().from(schema.notifications).where(eq(schema.notifications.event, "rfq.received"));
    const mine = inApp.filter((n) => n.href === `/supplier/rfqs/${id}`);
    const people = suppliers.map((s) => s.admin.id);
    expect(mine.map((n) => n.userId).sort()).toEqual([...people].sort());
    if (mailpit) {
      const res = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`subject:"quote by"`)}`);
      expect(res.ok).toBe(true);
    }
  });

  it("returns with reasons to the buyer, and rejects", async () => {
    const id = await submitted();
    await returnRfq(h.db, moderator, id, {
      reasons: ["Add the electrolyser size and type"],
      note: "Suppliers can't quote without it.",
    });
    const told = await h.db.select().from(schema.notifications).where(eq(schema.notifications.event, "rfq.returned"));
    expect(told.some((n) => n.userId === buyer.admin.id && n.href === `/rfq/new?draft=${id}`)).toBe(true);
    const detail = await moderationDetail(h.db, moderator, id);
    expect(detail?.decisions[0]?.reasons).toEqual(["Add the electrolyser size and type"]);

    const other = await submitted();
    await rejectRfq(h.db, moderator, other, { reason: "Not a real request" });
    const [row] = await h.db.select().from(schema.rfqs).where(eq(schema.rfqs.id, other));
    expect(row?.status).toBe("Closed");
    expect(row?.closeReason).toBe("rejected");
  });
});
