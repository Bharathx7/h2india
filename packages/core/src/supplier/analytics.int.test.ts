import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { istDate } from "../time";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { recordEvent, rollUpDay, supplierAnalytics } from "./analytics";

// Step 8.8 DONE WHEN: analytics numbers match the raw event counts for a test supplier. The supplier's own team and
// operators aren't counted; the viewer company's state is the only thing kept about a viewer.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("supplier analytics", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let productId = "";
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava", "supplier");
    const [cat] = await h.db.select().from(schema.catalogueCategories).limit(1);
    const [p] = await h.db
      .insert(schema.products)
      .values({
        organisationId: a.org.id,
        categoryId: cat?.id ?? "",
        slug: `an-${String(Date.now())}`,
        name: "Diaphragm compressor",
        model: "PDC-500",
        status: "Live",
      })
      .returning();
    productId = p?.id ?? "";
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("counts buyers' views and saves, not the supplier's own team, and matches the raw events", async () => {
    const buyer = await makeCompany(h.db, "Greenfield", "buyer");
    await h.db.update(schema.organisations).set({ state: "Gujarat" }).where(eq(schema.organisations.id, buyer.org.id));
    const buyerActor = await loadActor(h.db, buyer.admin.id);
    const own = await loadActor(h.db, a.admin.id);
    const op = await makeUser(h.db, "Operator");
    await h.db.execute(
      sql`insert into core.operator_roles (user_id, role_id) select ${op.id}, id from core.roles where scope = 'operator' and name = 'Super admin'`,
    );
    expect(await recordEvent(h.db, { type: "listing_viewed", productId, viewer: own })).toBe(false);
    expect(await recordEvent(h.db, { type: "listing_viewed", productId, viewer: await loadActor(h.db, op.id) })).toBe(
      false,
    );
    for (let i = 0; i < 3; i++) await recordEvent(h.db, { type: "listing_viewed", productId, viewer: buyerActor });
    await recordEvent(h.db, { type: "listing_viewed", productId, viewer: null });
    await recordEvent(h.db, { type: "profile_viewed", organisationId: a.org.id, viewer: null });
    await recordEvent(h.db, { type: "saved", productId, viewer: buyerActor });
    // Two views ten days ago, already rolled up.
    const old = new Date(Date.now() - 10 * 86_400_000);
    await h.db.insert(schema.analyticsEvents).values([
      { type: "listing_viewed", organisationId: a.org.id, productId, at: old },
      { type: "listing_viewed", organisationId: a.org.id, productId, at: old, viewerState: "Gujarat" },
    ]);
    await rollUpDay(h.db, istDate(old));

    const raw = await h.db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.analyticsEvents)
      .where(
        and(
          eq(schema.analyticsEvents.organisationId, a.org.id),
          sql`${schema.analyticsEvents.type} in ('listing_viewed','profile_viewed')`,
        ),
      );
    const r = await supplierAnalytics(h.db, scopeFor(own), a.org.id);
    expect(r.views).toBe(raw[0]?.n);
    expect(r.views).toBe(7);
    expect(r.saves).toBe(1);
    expect(r.storefrontViews).toBe(1);
    expect(r.top[0]).toMatchObject({ id: productId, views: 6, saves: 1 });
    expect(r.states.find((s) => s.state === "Gujarat")?.share).toBe(57);
    // Supplier B sees nothing of A's.
    const b = await makeCompany(h.db, "Bharat", "supplier");
    expect((await supplierAnalytics(h.db, scopeFor(await loadActor(h.db, b.admin.id)), a.org.id)).views).toBe(0);
  });
});
