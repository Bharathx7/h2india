import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { must } from "../must";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { hasOperatorRole, loadActor, setOperatorGate } from "./actor";

// Step 12.1 review: H1, a suspended person has no permissions whatever session they hold; H2, operator permissions
// count only when the web app's gate (a passkey session, A172) says so.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("actor gates (review H1, H2)", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 2 });
  });
  afterEach(() => {
    setOperatorGate(null);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  async function operator() {
    const u = await makeUser(h.db, "Gate operator");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Operations")));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: must(role).id });
    return u;
  }

  it("drops operator permissions when the gate refuses, and keeps company access", async () => {
    const u = await operator();
    const co = await makeCompany(h.db, "Gate co", "buyer");
    await h.db.insert(schema.memberships).values({ organisationId: co.org.id, userId: u.id, role: "Admin" });
    expect((await loadActor(h.db, u.id)).operator.size).toBeGreaterThan(0);
    setOperatorGate(() => Promise.resolve(false));
    const gated = await loadActor(h.db, u.id);
    expect(gated.operator.size).toBe(0);
    expect(gated.platform.has("operator")).toBe(false);
    expect(gated.companies.has(co.org.id)).toBe(true);
    expect(await hasOperatorRole(h.db, u.id)).toBe(true);
    setOperatorGate((id) => Promise.resolve(id === u.id));
    expect((await loadActor(h.db, u.id)).operator.size).toBeGreaterThan(0);
  });

  it("gives a suspended person no permissions at all", async () => {
    const co = await makeCompany(h.db, "Suspended co", "supplier");
    expect((await loadActor(h.db, co.admin.id)).companies.size).toBe(1);
    await h.db.update(schema.users).set({ suspendedAt: new Date() }).where(eq(schema.users.id, co.admin.id));
    const actor = await loadActor(h.db, co.admin.id);
    expect(actor.userId).toBeNull();
    expect(actor.companies.size).toBe(0);
  });
});
