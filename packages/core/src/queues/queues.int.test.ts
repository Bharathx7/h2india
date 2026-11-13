import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { makeUser, useTestEnv } from "../testing/factory";
import { claimItem, decideItem, QueueError } from "./index";

// Step 11.2 DONE WHEN: two operators cannot decide the same item; every decision sends its message once (the message
// is part of apply, which runs once, after the decision is recorded; if it fails the decision is undone).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("queue claims and decisions", () => {
  let h: DbHandle;
  let a: Actor;
  let b: Actor;
  let viewer: Actor;
  const subject = () => `item-${randomBytes(4).toString("hex")}`;
  async function op(role: string) {
    const u = await makeUser(h.db, `${role} queue`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    return loadActor(h.db, u.id);
  }
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 4 });
    a = await op("Operations");
    b = await op("Operations");
    viewer = await op("Content editor"); // queues.view only
  });
  afterAll(async () => {
    await h.pool.end();
  });

  let sent = 0;
  const tick = () => {
    sent++;
    return Promise.resolve();
  };

  it("only the claimant decides; the other is refused", async () => {
    sent = 0;
    const id = subject();
    await claimItem(h.db, a, { queue: "events", subjectId: id });
    await expect(decideItem(h.db, b, { queue: "events", subjectId: id, decision: "approve" }, tick)).rejects.toThrow(
      "is reviewing this",
    );
    await decideItem(h.db, a, { queue: "events", subjectId: id, decision: "approve" }, tick);
    await expect(decideItem(h.db, a, { queue: "events", subjectId: id, decision: "approve" }, tick)).rejects.toThrow(
      "already decided",
    );
    expect(sent).toBe(1);
  });

  it("two operators deciding at the same moment: exactly one wins", async () => {
    sent = 0;
    const id = subject();
    const results = await Promise.allSettled([
      decideItem(h.db, a, { queue: "jobs", subjectId: id, decision: "approve" }, tick),
      decideItem(h.db, b, { queue: "jobs", subjectId: id, decision: "approve" }, tick),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(sent).toBe(1);
  });

  it("needs reasons to return or reject, undoes a decision whose message failed, and audits", async () => {
    const id = subject();
    await expect(
      decideItem(h.db, a, { queue: "content", subjectId: id, decision: "changes" }, () => Promise.resolve()),
    ).rejects.toBeInstanceOf(QueueError);
    await expect(
      decideItem(
        h.db,
        a,
        { queue: "content", subjectId: id, decision: "changes", reasons: ["Add the venue address"] },
        () => Promise.reject(new Error("mail down")),
      ),
    ).rejects.toThrow("mail down");
    // Not decided: it can be decided again.
    await decideItem(
      h.db,
      a,
      { queue: "content", subjectId: id, decision: "changes", reasons: ["Add the venue address"] },
      async () => {},
    );
    const log = await h.db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.resourceType, "content"), eq(schema.auditLog.resourceId, id)));
    expect(log.map((l) => l.action)).toContain("queue.changes");
  });

  it("refuses operators without queues.edit", async () => {
    await expect(claimItem(h.db, viewer, { queue: "events", subjectId: subject() })).rejects.toThrow();
  });
});
