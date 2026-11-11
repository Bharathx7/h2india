import { sql } from "drizzle-orm";
import { pgSchema, text, uuid } from "drizzle-orm/pg-core";
import { auditLog, createDb, statusHistory, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { audit } from "./audit";
import { nextReference } from "./reference";
import { changeStatus, StatusConflictError, TransitionNotAllowedError } from "./status";

// Step 3.1 and 3.6 checks against a real PostgreSQL (TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL;

/** Drizzle wraps database errors; the database's own message is on the cause. */
async function dbError(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    return err.cause?.message ?? err.message ?? "";
  }
  return "no error";
}

const widgets = pgSchema("core").table("_test_widgets", {
  id: uuid("id").primaryKey(),
  status: text("status").notNull(),
});

describe.skipIf(!url)("database foundations", () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = createDb(url ?? "", { max: 20 });
    await h.db.execute(sql`CREATE TABLE IF NOT EXISTS core._test_widgets (id uuid PRIMARY KEY, status text NOT NULL)`);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("never hands out the same reference number twice, even all at once", async () => {
    const refs = await Promise.all(
      Array.from({ length: 60 }, () => nextReference(h.db, "ORD", new Date("2026-11-11T12:00:00Z"))),
    );
    expect(new Set(refs).size).toBe(60);
    expect(refs.every((r) => /^ORD-2026-\d{4}$/.test(r))).toBe(true);
    expect([...refs].sort()[0]).toBe("ORD-2026-0001");
  });

  it("starts each year and type at 0001, using the year in India time", async () => {
    // 31 Dec 2026 20:00 UTC is 1 Jan 2027 in India.
    expect(await nextReference(h.db, "RFQ", new Date("2026-12-31T20:00:00Z"))).toBe("RFQ-2027-0001");
    expect(await nextReference(h.db, "Q", new Date("2026-06-01T00:00:00Z"))).toBe("Q-2026-0001");
  });

  it("changes a status with history and audit in one transaction", async () => {
    const id = uuidv7();
    await h.db.insert(widgets).values({ id, status: "Draft" });
    const actor = uuidv7();
    await changeStatus(h.db, {
      table: widgets,
      entityType: "widget",
      id,
      from: "Draft",
      to: "Submitted",
      actorId: actor,
      reason: "Ready for review",
      transitions: { Draft: ["Submitted"], Submitted: ["Approved", "Rejected"] },
    });
    const [row] = await h.db.select().from(widgets).where(eq(widgets.id, id));
    expect(row?.status).toBe("Submitted");
    const history = await h.db.select().from(statusHistory).where(eq(statusHistory.entityId, id));
    expect(history.map((x) => [x.fromStatus, x.toStatus, x.reason])).toEqual([
      ["Draft", "Submitted", "Ready for review"],
    ]);
    const entries = await h.db.select().from(auditLog).where(eq(auditLog.resourceId, id));
    expect(entries[0]?.before).toEqual({ status: "Draft" });
    expect(entries[0]?.after).toEqual({ status: "Submitted" });
    expect(entries[0]?.actorId).toBe(actor);
  });

  it("refuses a change from a status the record is no longer in, and writes nothing", async () => {
    const id = uuidv7();
    await h.db.insert(widgets).values({ id, status: "Approved" });
    await expect(
      changeStatus(h.db, { table: widgets, entityType: "widget", id, from: "Draft", to: "Submitted", actorId: null }),
    ).rejects.toBeInstanceOf(StatusConflictError);
    const history = await h.db.select().from(statusHistory).where(eq(statusHistory.entityId, id));
    expect(history).toHaveLength(0);
  });

  it("refuses a move the transition table does not allow", async () => {
    await expect(
      changeStatus(h.db, {
        table: widgets,
        entityType: "widget",
        id: uuidv7(),
        from: "Draft",
        to: "Approved",
        actorId: null,
        transitions: { Draft: ["Submitted"] },
      }),
    ).rejects.toBeInstanceOf(TransitionNotAllowedError);
  });

  it("keeps the audit log append-only at the database level", async () => {
    const id = uuidv7();
    await audit(h.db, {
      action: "settings.change",
      resourceType: "setting",
      resourceId: id,
      before: { a: 1 },
      after: { a: 2 },
    });
    expect(await dbError(h.db.update(auditLog).set({ action: "tampered" }).where(eq(auditLog.resourceId, id)))).toMatch(
      /append-only: UPDATE/,
    );
    expect(await dbError(h.db.delete(auditLog).where(eq(auditLog.resourceId, id)))).toMatch(/append-only: DELETE/);
    expect(await dbError(h.db.execute(sql`TRUNCATE core.audit_log`))).toMatch(/append-only: TRUNCATE/);
  });

  it("masks sensitive values before they are stored", async () => {
    const id = uuidv7();
    await audit(h.db, {
      action: "payout.bank_change",
      resourceType: "payout_account",
      resourceId: id,
      before: { accountNumber: "123456789012", ifsc: "HDFC0001234" },
      after: { accountNumber: "999988887777", ifsc: "ICIC0004321", otp: "482916" },
    });
    const [entry] = await h.db.select().from(auditLog).where(eq(auditLog.resourceId, id));
    expect(entry?.after).toEqual({ accountNumber: "••••7777", ifsc: "••••4321", otp: "••••" });
    expect(JSON.stringify(entry)).not.toContain("999988887777");
  });
});
