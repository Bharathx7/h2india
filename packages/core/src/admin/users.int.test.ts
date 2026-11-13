import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { productSearchDocuments } from "../search/products";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import {
  endViewAs,
  isSuspended,
  liftSuspension,
  startViewAs,
  suspendCompany,
  suspendUser,
  UserAdminError,
  viewAsGrant,
} from "./users";

// Step 11.4 DONE WHEN: every suspend and view-as is in the audit log with actor and reason; a suspended supplier's
// listings disappear from search. (Writes refused in view-as: proxy.test.ts in the web app.)
const url = process.env.TEST_DATABASE_URL;
const tag = randomBytes(3).toString("hex");

describe.skipIf(!url)("users, suspension and view-as", () => {
  let h: DbHandle;
  let admin: Actor;
  let viewer: Actor;
  async function op(role: string) {
    const u = await makeUser(h.db, `${role} 11.4`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    return loadActor(h.db, u.id);
  }
  const log = (resourceId: string, action: string) =>
    h.db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.resourceId, resourceId), eq(schema.auditLog.action, action)));
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    admin = await op("Super admin");
    viewer = await op("Content editor");
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("suspending ends sessions, refuses sign-in and is audited with the reason", async () => {
    const person = await makeUser(h.db, "To suspend");
    await h.db.insert(schema.sessions).values({
      id: crypto.randomUUID(),
      userId: person.id,
      token: `t-${tag}`,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await expect(suspendUser(h.db, viewer, person.id, "spam")).rejects.toThrow();
    await expect(suspendUser(h.db, admin, person.id, "")).rejects.toBeInstanceOf(UserAdminError);
    await suspendUser(h.db, admin, person.id, "Posting spam RFQs");
    expect(await isSuspended(h.db, person.email)).toBe(true);
    expect(await h.db.select().from(schema.sessions).where(eq(schema.sessions.userId, person.id))).toEqual([]);
    const [entry] = await log(person.id, "user.suspended");
    expect(entry?.actorId).toBe(admin.userId);
    expect(entry?.reason).toBe("Posting spam RFQs");
    await liftSuspension(h.db, admin, person.id, "Appeal accepted");
    expect(await isSuspended(h.db, person.email)).toBe(false);
  });

  it("a suspended supplier's listings leave search", async () => {
    const s = await makeCompany(h.db, `Suspend supplier ${tag}`, "supplier");
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: s.org.id, slug: `suspend-${tag}`, tradeName: "Suspend Co" });
    const [cat] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "equipment", slug: `susp-${tag}`, label: "Susp" })
      .returning();
    const [p] = await h.db
      .insert(schema.products)
      .values({
        organisationId: s.org.id,
        categoryId: cat?.id ?? "",
        status: "Live",
        publishedAt: new Date(),
        slug: `susp-p-${tag}`,
        name: "Susp product",
      })
      .returning();
    const visible = async () =>
      (await productSearchDocuments(h.db, { includeSample: false, ids: [p?.id ?? ""] })).some((d) => d.id === p?.id);
    expect(await visible()).toBe(true);
    await suspendCompany(h.db, admin, s.org.id, "Fake certificates");
    expect(await visible()).toBe(false);
    expect((await log(s.org.id, "company.suspended"))[0]?.reason).toBe("Fake certificates");
    await suspendCompany(h.db, admin, s.org.id, null);
    expect(await visible()).toBe(true);
  });

  it("view-as needs a reason, belongs to one operator, expires, and is audited", async () => {
    const person = await makeUser(h.db, "Viewed person");
    await expect(startViewAs(h.db, admin, person.id, "look")).rejects.toBeInstanceOf(UserAdminError);
    const { token } = await startViewAs(h.db, admin, person.id, "Checking a reported checkout bug");
    expect((await viewAsGrant(h.db, token, admin.userId ?? ""))?.grant.userId).toBe(person.id);
    // Another operator can't use the token, and it expires.
    expect(await viewAsGrant(h.db, token, viewer.userId ?? "")).toBeNull();
    expect(await viewAsGrant(h.db, token, admin.userId ?? "", new Date(Date.now() + 16 * 60_000))).toBeNull();
    expect((await log(person.id, "view_as.started"))[0]?.reason).toBe("Checking a reported checkout bug");
    await endViewAs(h.db, token, admin.userId ?? "");
    expect(await viewAsGrant(h.db, token, admin.userId ?? "")).toBeNull();
  });
});
