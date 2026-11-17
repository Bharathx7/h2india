import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { listingQueue } from "../products/editor";
import { moderationQueue } from "../rfq/moderation";
import { makeUser, useTestEnv } from "../testing/factory";
import { storefrontQueue } from "../supplier/storefront";
import { adminAreas, adminCounts, overviewTiles, unansweredRfqs } from "./overview";

// Step 11.1 DONE WHEN: a Content editor sees Content and Queues but not Money; Overview counts match the queues.
const url = process.env.TEST_DATABASE_URL;

async function operator(h: DbHandle, role: string) {
  const u = await makeUser(h.db, `${role} 11.1`);
  const [r] = await h.db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
  if (!r) throw new Error(`${role} role missing`);
  await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r.id });
  return loadActor(h.db, u.id);
}

describe.skipIf(!url)("admin overview", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 2 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("shows each operator only their areas; Commerce only with transactions on", async () => {
    const editor = adminAreas(await operator(h, "Content editor"), {});
    expect(editor.content).toBe(true);
    expect(editor.queues).toBe(true);
    expect(editor.money).toBe(false);
    expect(editor.users).toBe(false);
    const finance = await operator(h, "Finance");
    expect(adminAreas(finance, {}).money).toBe(false);
    expect(adminAreas(finance, { FLAG_TRANSACTIONS: "true" }).money).toBe(true);
    expect(adminAreas(finance, { FLAG_TRANSACTIONS: "true" }).content).toBe(false);
  });

  it("counts the same records the queues list", async () => {
    const admin = await operator(h, "Super admin");
    const tiles = await overviewTiles(h.db, admin);
    const count = (k: string) => tiles.find((t) => t.key === k)?.count;
    expect(count("listings")).toBe((await listingQueue(h.db, admin)).length);
    expect(count("rfqs")).toBe((await moderationQueue(h.db, admin)).length);
    // Founder QC (17 Nov 2026): the unanswered tile opens its own list, and the sidebar's Queues count includes every
    // core-held tab (listings with storefront changes, RFQs, suppliers, category requests).
    expect(count("unanswered")).toBe((await unansweredRfqs(h.db, admin)).length);
    expect(tiles.find((t) => t.key === "unanswered")?.href).toBe("/admin/queues/rfqs/unanswered");
    expect(tiles.find((t) => t.key === "suppliers")?.href).toBe("/admin/queues/suppliers");
    const sidebar = await adminCounts(h.db);
    expect(sidebar.queues).toBe(
      (count("listings") ?? 0) +
        (await storefrontQueue(h.db, admin)).length +
        (count("rfqs") ?? 0) +
        (count("suppliers") ?? 0) +
        (count("categories") ?? 0),
    );
    // A Content editor gets no verification tile.
    const editor = await operator(h, "Content editor");
    expect((await overviewTiles(h.db, editor)).some((t) => t.key === "suppliers")).toBe(false);
  });
});
