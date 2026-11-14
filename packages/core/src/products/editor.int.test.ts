import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { productDetail } from "./detail";
import {
  decideRevision,
  editableProduct,
  listingQueue,
  saveProduct,
  setListingStatus,
  supplierProducts,
} from "./editor";

// Step 8.3 DONE WHEN: a submitted product appears in the Listings queue and not on the site; Needs changes keeps the
// operator's reasons field by field; approving publishes the listing (and sends Listing approved); paused products
// leave search (their change is queued for the index in the same transaction). Needs TEST_DATABASE_URL; Mailpit.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("product editor and listing review", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let b: Awaited<ReturnType<typeof makeCompany>>;
  let categoryId = "";
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava", "supplier");
    b = await makeCompany(h.db, "Bharat", "supplier");
    const [cat] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "systems", slug: `test-${String(Date.now())}`, label: "Test compressors" })
      .returning();
    categoryId = cat?.id ?? "";
    // Products show on the site only with their company's public profile.
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: a.org.id, slug: `pranava-${String(Date.now())}`, tradeName: "Pranava H2" });
    await h.db.insert(schema.catalogueAttributes).values({
      categoryId,
      key: "outlet_pressure",
      label: "Outlet pressure",
      type: "number",
      unit: "bar",
      min: 1,
      max: 1000,
      required: true,
      displayGroup: "Performance",
    });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  async function operator() {
    const op = await makeUser(h.db, "Rohit Moderator");
    await h.db.execute(
      sql`insert into core.operator_roles (user_id, role_id) select ${op.id}, id from core.roles where scope = 'operator' and name = 'Catalogue moderator'`,
    );
    return loadActor(h.db, op.id);
  }
  const product = {
    categoryId,
    name: "Diaphragm compressor, 500 bar",
    model: "PDC-500",
    pricing: "quote" as const,
    leadTimeMinWeeks: 14,
    leadTimeMaxWeeks: 16,
    stock: "made_to_order",
  };

  it("a submission waits in the queue, off the site, and comes back with notes field by field", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    const op = await operator();
    // Required spec missing: submit is refused with the field named.
    await expect(
      saveProduct(h.db, actor, a.org.id, { data: { ...product, categoryId, attributes: {} }, submit: true }),
    ).rejects.toMatchObject({
      errors: { outlet_pressure: "Enter outlet pressure" },
    });
    const draft = await saveProduct(h.db, actor, a.org.id, {
      data: { ...product, categoryId, attributes: { outlet_pressure: 500 } },
      submit: false,
    });
    expect(draft.status).toBe("Draft");
    const sent = await saveProduct(h.db, actor, a.org.id, { id: draft.id, data: { categoryId }, submit: true });
    expect(sent.status).toBe("In review");
    const [row] = await h.db.select().from(schema.products).where(eq(schema.products.id, draft.id));
    expect(await productDetail(h.db, row?.slug ?? "", { includeSample: true })).toBeNull();
    const queue = await listingQueue(h.db, op);
    const mine = queue.find((q) => q.r.productId === draft.id);
    expect(mine?.r.kind).toBe("new listing");

    await expect(
      decideRevision(h.db, op, { id: mine?.r.id ?? "", outcome: "Needs changes", notes: [] }),
    ).rejects.toThrow("change");
    await decideRevision(h.db, op, {
      id: mine?.r.id ?? "",
      outcome: "Needs changes",
      notes: [{ field: "outlet_pressure", section: "specifications", text: "Add the test conditions" }],
    });
    const edit = await editableProduct(h.db, scopeFor(actor), a.org.id, draft.id);
    expect(edit?.shown).toBe("Needs changes");
    expect(edit?.lastReview?.notes).toEqual([
      { field: "outlet_pressure", section: "specifications", text: "Add the test conditions" },
    ]);
  });

  it("approval publishes a verified supplier's listing; a live change waits while the live version stays up", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    const op = await operator();
    const p = await saveProduct(h.db, actor, a.org.id, {
      data: { ...product, categoryId, name: "Piston compressor", attributes: { outlet_pressure: 300 } },
      submit: true,
    });
    const rev = (await listingQueue(h.db, op)).find((q) => q.r.productId === p.id);
    // The company isn't verified yet: listings wait.
    await expect(decideRevision(h.db, op, { id: rev?.r.id ?? "", outcome: "Approved" })).rejects.toThrow(
      "Verification",
    );
    await h.db
      .update(schema.organisations)
      .set({ verification: "Verified" })
      .where(eq(schema.organisations.id, a.org.id));
    await decideRevision(h.db, op, { id: rev?.r.id ?? "", outcome: "Approved" });
    const [live] = await h.db.select().from(schema.products).where(eq(schema.products.id, p.id));
    expect(live?.status).toBe("Live");
    expect(await productDetail(h.db, live?.slug ?? "", { includeSample: true })).not.toBeNull();
    const sent = await h.db
      .select()
      .from(schema.notificationDeliveries)
      .where(
        and(
          eq(schema.notificationDeliveries.userId, a.admin.id),
          eq(schema.notificationDeliveries.event, "listing.approved"),
        ),
      );
    expect(sent.length).toBe(1);

    // A spec change on the live listing: lead time goes live now; the pressure waits for review.
    await saveProduct(h.db, actor, a.org.id, {
      id: p.id,
      data: { attributes: { outlet_pressure: 350 }, leadTimeMinWeeks: 10 },
      submit: true,
    });
    const [still] = await h.db.select().from(schema.products).where(eq(schema.products.id, p.id));
    expect(still?.attributes).toEqual({ outlet_pressure: 300 });
    expect(still?.leadTimeMinWeeks).toBe(10);
    expect(still?.status).toBe("Live");
    const change = (await listingQueue(h.db, op)).find((q) => q.r.productId === p.id);
    expect(change?.r.kind).toBe("spec change");
    await decideRevision(h.db, op, { id: change?.r.id ?? "", outcome: "Approved" });
    const [applied] = await h.db.select().from(schema.products).where(eq(schema.products.id, p.id));
    expect(applied?.attributes).toEqual({ outlet_pressure: 350 });

    // Pausing takes it off the site and queues the search change.
    const before = await h.db.select().from(schema.searchOutbox).where(eq(schema.searchOutbox.recordId, p.id));
    expect(await setListingStatus(h.db, actor, a.org.id, { ids: [p.id], to: "Paused" })).toBe(1);
    const after = await h.db.select().from(schema.searchOutbox).where(eq(schema.searchOutbox.recordId, p.id));
    expect(after.length).toBe(before.length + 1);
    expect(await productDetail(h.db, applied?.slug ?? "", { includeSample: true })).toBeNull();
  });

  it("supplier B can't see or change supplier A's products", async () => {
    const aActor = await loadActor(h.db, a.admin.id);
    const bActor = await loadActor(h.db, b.admin.id);
    const p = await saveProduct(h.db, aActor, a.org.id, {
      data: { ...product, categoryId, name: "Hidden draft" },
      submit: false,
    });
    expect((await supplierProducts(h.db, scopeFor(bActor), a.org.id)).items).toEqual([]);
    expect(await editableProduct(h.db, scopeFor(bActor), a.org.id, p.id)).toBeNull();
    await expect(
      saveProduct(h.db, bActor, a.org.id, { id: p.id, data: { name: "Taken" }, submit: false }),
    ).rejects.toThrow("Not allowed");
    expect(await setListingStatus(h.db, bActor, a.org.id, { ids: [p.id], to: "Archived" }).catch(() => -1)).toBe(-1);
  });
});
