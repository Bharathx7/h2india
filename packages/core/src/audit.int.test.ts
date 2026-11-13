import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { audit, exportAuditCsv, mask, pruneAuditLog, readAuditLog } from "./audit";
import { loadActor } from "./authz/actor";
import { bootstrapSuperAdmin, grantOperatorRole, revokeOperatorRole } from "./authz/grants";
import { changeMemberRole } from "./companies/repo";
import { defineSetting, getSetting, setSetting } from "./settings";
import { makeUser, twoCompanies, useTestEnv } from "./testing/factory";

// Step 3.6 DONE WHEN: updating or deleting an audit row fails at the database level; changing a setting writes an
// entry with before and after values; sensitive values (bank numbers, codes) are masked.
const url = process.env.TEST_DATABASE_URL;

const testSwitch = defineSetting({
  key: "test.auditSwitch",
  description: "Used only by this test",
  schema: z.object({ on: z.boolean(), limit: z.number().int() }),
  fallback: { on: false, limit: 10 },
});

describe.skipIf(!url)("audit log", () => {
  let h: DbHandle;
  let data: Awaited<ReturnType<typeof twoCompanies>>;
  const grant = async (userId: string, role: string) => {
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId, roleId: r?.id ?? "" });
  };
  const latest = async (action: string, resourceId: string) => {
    const [row] = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, action), eq(auditLog.resourceId, resourceId)))
      .orderBy(desc(auditLog.at))
      .limit(1);
    return row;
  };
  const dbError = async (p: PromiseLike<unknown>) => {
    try {
      await p;
      return "no error";
    } catch (e) {
      const err = e as { cause?: { message?: string }; message: string };
      return err.cause?.message ?? err.message;
    }
  };

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    data = await twoCompanies(h.db);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("refuses UPDATE and DELETE on recent rows, even with the retention switch on", async () => {
    const id = `t-${crypto.randomUUID()}`;
    await audit(h.db, { action: "test.append", resourceType: "test", resourceId: id });
    expect(await dbError(h.db.update(auditLog).set({ action: "x" }).where(eq(auditLog.resourceId, id)))).toMatch(
      /append-only: UPDATE/,
    );
    const forced = await dbError(
      h.db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL h2.audit_retention = 'on'`);
        await tx.delete(auditLog).where(eq(auditLog.resourceId, id));
      }),
    );
    expect(forced).toMatch(/append-only: DELETE/);
    expect(await latest("test.append", id)).toBeDefined();
  });

  it("removes only entries older than 8 years, inside the retention job, and records it", async () => {
    // Old rows can only exist by being inserted with an old time (the default is now()).
    const oldId = `old-${crypto.randomUUID()}`;
    const keepId = `keep-${crypto.randomUUID()}`;
    await h.db.insert(auditLog).values([
      { action: "test.old", resourceType: "test", resourceId: oldId, at: sql`now() - interval '8 years 1 day'` },
      { action: "test.old", resourceType: "test", resourceId: keepId, at: sql`now() - interval '7 years 360 days'` },
    ]);
    expect(await dbError(h.db.delete(auditLog).where(eq(auditLog.resourceId, oldId)))).toMatch(/append-only: DELETE/);
    expect(await pruneAuditLog(h.db)).toBeGreaterThanOrEqual(1);
    expect(await latest("test.old", oldId)).toBeUndefined();
    expect(await latest("test.old", keepId)).toBeDefined();
    const [entry] = await h.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "audit.retention"))
      .orderBy(desc(auditLog.at))
      .limit(1);
    expect(entry?.after).toMatchObject({ olderThanYears: 8 });
  });

  it("writes before and after values when a setting changes, and needs settings.edit", async () => {
    const operator = await makeUser(h.db, "Settings Operator");
    await grant(operator.id, "Super admin");
    const actor = await loadActor(h.db, operator.id);
    const reader = await loadActor(h.db, data.a.admin.id);

    await expect(setSetting(h.db, reader, testSwitch, { on: true, limit: 5 })).rejects.toThrow("Not allowed");
    expect(await getSetting(h.db, testSwitch)).toEqual({ on: false, limit: 10 });

    await setSetting(
      h.db,
      actor,
      testSwitch,
      { on: true, limit: 5 },
      {
        reason: "Pilot",
        context: { ip: "203.0.113.9", userAgent: "vitest", requestId: "req-settings-1" },
      },
    );
    expect(await getSetting(h.db, testSwitch)).toEqual({ on: true, limit: 5 });
    const first = await latest("setting.change", testSwitch.key);
    expect(first).toMatchObject({
      actorId: operator.id,
      before: { value: { on: false, limit: 10 }, saved: false },
      after: { value: { on: true, limit: 5 } },
      reason: "Pilot",
      ip: "203.0.113.9",
      requestId: "req-settings-1",
    });

    await setSetting(h.db, actor, testSwitch, { on: false, limit: 5 });
    expect(await latest("setting.change", testSwitch.key)).toMatchObject({
      before: { value: { on: true, limit: 5 }, saved: true },
      after: { value: { on: false, limit: 5 } },
    });
    await expect(setSetting(h.db, actor, testSwitch, { on: true, limit: 1.5 })).rejects.toThrow();
  });

  it("masks codes, secrets, bank and identity numbers, and mobiles", () => {
    expect(
      mask({
        code: "482913",
        otp: "111222",
        password: "p",
        tokenHash: "abc",
        accountNumber: "123456789012",
        ifsc: "HDFC0001234",
        panNumber: "AAKCT1234A",
        mobile: "+919812345678",
        contactPhone: "02212345678",
        mobileVerifiedAt: "2026-11-12T10:00:00Z",
        nested: [{ card_number: "4111111111111111" }],
        legalName: "Alpha Test Company",
      }),
    ).toEqual({
      code: "••••",
      otp: "••••",
      password: "••••",
      tokenHash: "••••",
      accountNumber: "••••9012",
      ifsc: "••••1234",
      panNumber: "••••234A",
      mobile: "••••5678",
      contactPhone: "••••5678",
      mobileVerifiedAt: "2026-11-12T10:00:00Z",
      nested: [{ card_number: "••••1111" }],
      legalName: "Alpha Test Company",
    });
  });

  it("stores masked values, never the raw ones", async () => {
    const id = `bank-${crypto.randomUUID()}`;
    await audit(h.db, {
      action: "test.bank",
      resourceType: "test",
      resourceId: id,
      before: { accountNumber: "998877665544", code: "123456" },
    });
    const row = await latest("test.bank", id);
    expect(JSON.stringify(row?.before)).not.toContain("998877665544");
    expect(row?.before).toEqual({ accountNumber: "••••5544", code: "••••" });
  });

  it("audits company role changes with before and after", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    await changeMemberRole(h.db, admin, {
      organisationId: data.a.org.id,
      userId: data.a.requester.id,
      role: "Approver",
      orderLimitPaise: 5_000_000n,
      reason: "Covers purchasing",
    });
    expect(await latest("membership.change", data.a.requester.id)).toMatchObject({
      actorId: data.a.admin.id,
      companyId: data.a.org.id,
      before: { role: "Requester", orderLimitPaise: null },
      after: { role: "Approver", orderLimitPaise: "5000000" },
      reason: "Covers purchasing",
    });
  });

  it("lets only a Super admin change operator roles, audits it, and keeps one Super admin", async () => {
    const boss = await makeUser(h.db, "Grant Boss");
    await grant(boss.id, "Super admin");
    const finance = await makeUser(h.db, "Grant Finance");
    await grant(finance.id, "Finance");
    const newcomer = await makeUser(h.db, "Grant Newcomer");

    const financeActor = await loadActor(h.db, finance.id);
    await expect(grantOperatorRole(h.db, financeActor, { userId: finance.id, role: "Super admin" })).rejects.toThrow(
      "Not allowed",
    );

    const bossActor = await loadActor(h.db, boss.id);
    await grantOperatorRole(h.db, bossActor, { userId: newcomer.id, role: "Content editor", reason: "New hire" });
    expect(await latest("operator_role.grant", newcomer.id)).toMatchObject({
      actorId: boss.id,
      before: { roles: [] },
      after: { roles: ["Content editor"] },
      reason: "New hire",
    });
    expect((await loadActor(h.db, newcomer.id)).operator.has("content.edit")).toBe(true);

    await revokeOperatorRole(h.db, bossActor, { userId: newcomer.id, role: "Content editor" });
    expect(await latest("operator_role.revoke", newcomer.id)).toMatchObject({
      before: { roles: ["Content editor"] },
      after: { roles: [] },
    });

    // Remove every other Super admin left by earlier tests, then the last one must stay.
    const supers = await h.db
      .select({ userId: schema.operatorRoles.userId })
      .from(schema.operatorRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.operatorRoles.roleId))
      .where(eq(schema.roles.name, "Super admin"));
    for (const s of supers) {
      if (s.userId !== boss.id) await revokeOperatorRole(h.db, bossActor, { userId: s.userId, role: "Super admin" });
    }
    await expect(revokeOperatorRole(h.db, bossActor, { userId: boss.id, role: "Super admin" })).rejects.toMatchObject({
      code: "LAST_SUPER_ADMIN",
    });
    // The server's first-Super-admin command works only while there is none (step 1.7).
    const email = `second-${crypto.randomUUID()}@example.test`;
    await expect(bootstrapSuperAdmin(h.db, { email, name: "Second Boss" })).rejects.toMatchObject({
      code: "SUPER_ADMIN_EXISTS",
    });
    expect(await h.db.select().from(schema.users).where(eq(schema.users.email, email))).toEqual([]);
  });

  it("lets operators with Users access read the log and export it; the export is audited", async () => {
    const id = `q-${crypto.randomUUID()}`;
    await audit(h.db, { action: "test.query", resourceType: "test", resourceId: id, reason: '=HYPERLINK("x")' });
    const company = await loadActor(h.db, data.a.admin.id);
    await expect(readAuditLog(h.db, company, { resourceId: id })).rejects.toThrow("Not allowed");
    await expect(exportAuditCsv(h.db, company, { resourceId: id })).rejects.toThrow("Not allowed");

    const viewer = await makeUser(h.db, "Audit Viewer");
    await grant(viewer.id, "Operations");
    const actor = await loadActor(h.db, viewer.id);
    const rows = await readAuditLog(h.db, actor, { resourceId: id });
    expect(rows.map((r) => r.action)).toEqual(["test.query"]);

    const exporter = await makeUser(h.db, "Audit Exporter");
    await grant(exporter.id, "Super admin");
    const csv = await exportAuditCsv(h.db, await loadActor(h.db, exporter.id), { resourceId: id });
    expect(csv.split("\n")[0]).toBe(
      "at,actorId,actingAsId,action,resourceType,resourceId,companyId,reason,ip,requestId,before,after",
    );
    expect(csv).toContain(`'=HYPERLINK(""x"")`);
    const [exported] = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "audit.export"), eq(auditLog.actorId, exporter.id)));
    expect(exported?.after).toMatchObject({ rows: 1 });
  });
});
