import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { makeCompany, useTestEnv } from "../testing/factory";
import { supplierChecklist } from "./checklist";
import { supplierOf } from "./context";
import { latestReview, submitForReview, SupplierReviewError } from "./review";

// Stage 8 supplier records, against PostgreSQL. Each step adds its checks here, and a case proving supplier B
// cannot read or change supplier A's records (CLAUDE.md, step 3.4).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("supplier workspace", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let b: Awaited<ReturnType<typeof makeCompany>>;
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava", "supplier");
    b = await makeCompany(h.db, "Bharat", "supplier");
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("8.1: the checklist follows the records, and review opens only when ready", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    expect((await supplierOf(h.db, actor))?.organisationId).toBe(a.org.id);
    expect((await supplierChecklist(h.db, a.org.id)).done).toBe(0);
    await h.db.update(schema.organisations).set({ state: "Tamil Nadu" }).where(eq(schema.organisations.id, a.org.id));
    await h.db
      .insert(schema.organisationGstins)
      .values({ organisationId: a.org.id, gstin: `33AAJCP${String(Date.now()).slice(-4)}L1Z4`, stateCode: "33" });
    expect((await supplierChecklist(h.db, a.org.id)).items[0]?.state).toBe("checking");
    await expect(submitForReview(h.db, actor, a.org.id)).rejects.toBeInstanceOf(SupplierReviewError);
    // A Viewer can't submit.
    await expect(submitForReview(h.db, await loadActor(h.db, a.requester.id), a.org.id)).rejects.toThrow("admin");
  });

  it("supplier B cannot read or submit supplier A's review", async () => {
    const bActor = await loadActor(h.db, b.admin.id);
    await h.db.insert(schema.supplierReviews).values({ organisationId: a.org.id, submittedBy: a.admin.id });
    expect(await latestReview(h.db, scopeFor(bActor), a.org.id)).toBeNull();
    expect((await latestReview(h.db, scopeFor(await loadActor(h.db, a.admin.id)), a.org.id))?.status).toBe("Submitted");
    await expect(submitForReview(h.db, bActor, a.org.id)).rejects.toThrow();
  });
});
