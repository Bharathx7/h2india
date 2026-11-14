import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { audit } from "../audit";
import { loadActor, type Actor } from "../authz/actor";
import { runDeadlines } from "../clocks/clocks";
import { raiseGrievance } from "../grievances/grievances";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import "./escalation";
import { DataRightsError, eraseForRequest, erasurePlan, receiveRequest } from "./data-rights";

// Step 11.7 DONE WHEN: an erasure dry run lists every table and file affected before anything is deleted; records the
// law keeps survive erasure with personal fields masked; a grievance escalates when late.
const url = process.env.TEST_DATABASE_URL;
const tag = randomBytes(3).toString("hex");

describe.skipIf(!url)("compliance", () => {
  let h: DbHandle;
  let officer: Actor;
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    const u = await makeUser(h.db, "Grievance officer");
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Editor-in-chief")));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    officer = await loadActor(h.db, u.id);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("dry run first, then erasure masks what's kept and deletes the rest", async () => {
    const person = await makeUser(h.db, `Erase me ${tag}`);
    await h.db
      .insert(schema.follows)
      .values({ userId: person.id, targetType: "topic", targetId: "electrolysers", label: "Electrolysers" });
    await h.db
      .insert(schema.newsletterSubscribers)
      .values({ email: person.email, status: "confirmed", source: "test", consentVersion: "t", linkNonce: "n" });
    const raised = await raiseGrievance(h.db, {
      type: "Other",
      pageUrl: "https://h2india.example/x",
      description: "A complaint long enough to be valid here.",
      name: "Erase Me",
      email: person.email,
      mobile: "",
    });
    if (!raised.ok) throw new Error("grievance not raised");
    await audit(h.db, { actorId: person.id, action: "test.action", resourceType: "test", resourceId: "x" });

    const req = await receiveRequest(h.db, officer, { kind: "erase", email: person.email });
    expect(req.reference).toMatch(/^DRR-\d{4}-\d{4}$/);
    await expect(eraseForRequest(h.db, officer, req.id)).rejects.toBeInstanceOf(DataRightsError);
    const plan = await erasurePlan(h.db, officer, req.id);
    const line = (t: string) => plan.lines.find((l) => l.table === t);
    expect(line("follows")).toMatchObject({ action: "delete", rows: 1 });
    expect(line("newsletter_subscribers")).toMatchObject({ action: "delete", rows: 1 });
    expect(line("grievances")).toMatchObject({ action: "mask", rows: 1 });
    expect(line("audit_log")?.action).toBe("keep");
    expect(line("files")?.action).toBe("delete");
    // Nothing deleted by the dry run.
    expect(await h.db.select().from(schema.follows).where(eq(schema.follows.userId, person.id))).toHaveLength(1);

    await eraseForRequest(h.db, officer, req.id);
    expect(await h.db.select().from(schema.follows).where(eq(schema.follows.userId, person.id))).toHaveLength(0);
    const [user] = await h.db.select().from(schema.users).where(eq(schema.users.id, person.id));
    expect(user?.name).toBe("Erased person");
    expect(user?.email).toMatch(/@erased\.invalid$/);
    const [g] = await h.db.select().from(schema.grievances).where(eq(schema.grievances.id, raised.grievance.id));
    expect(g?.reference).toBe(raised.grievance.reference);
    expect(g?.email).toMatch(/@erased\.invalid$/);
    expect(
      await h.db
        .select()
        .from(schema.auditLog)
        .where(and(eq(schema.auditLog.actorId, person.id), eq(schema.auditLog.action, "test.action"))),
    ).toHaveLength(1);
  });

  it("won't erase a company's only admin", async () => {
    const c = await makeCompany(h.db, `Sole admin ${tag}`);
    await h.db
      .delete(schema.memberships)
      .where(and(eq(schema.memberships.organisationId, c.org.id), eq(schema.memberships.userId, c.requester.id)));
    const req = await receiveRequest(h.db, officer, { kind: "erase", email: c.admin.email });
    const plan = await erasurePlan(h.db, officer, req.id);
    expect(plan.blockers[0]).toMatch("Only admin");
    await expect(eraseForRequest(h.db, officer, req.id)).rejects.toThrow("Only admin");
  });

  it("a grievance not acknowledged in time escalates to compliance operators", async () => {
    const raised = await raiseGrievance(h.db, {
      type: "Other",
      pageUrl: "https://h2india.example/y",
      description: "Another complaint that is long enough.",
      name: "Late",
      email: `late-${tag}@example.com`,
      mobile: "",
    });
    if (!raised.ok) throw new Error("grievance not raised");
    await runDeadlines(h.db, new Date(Date.now() + 3 * 86_400_000));
    const notes = await h.db
      .select()
      .from(schema.notifications)
      .where(
        and(eq(schema.notifications.userId, officer.userId ?? ""), eq(schema.notifications.event, "grievance.expire")),
      );
    expect(notes.some((n) => n.title.includes(raised.grievance.reference))).toBe(true);
  });
});
