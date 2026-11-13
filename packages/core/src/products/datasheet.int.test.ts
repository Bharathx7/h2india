import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useDatasheetReader } from "../adapters/datasheet";
import { fakeDatasheetReader } from "../adapters/datasheet/fake";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { makeCompany, useTestEnv } from "../testing/factory";
import { decideField, getExtraction, runExtraction, startExtraction, submitExtraction } from "./datasheet";

// Step 8.4 DONE WHEN: a datasheet produces a draft with confidences, and Submit stays refused until Medium and Low fields
// are checked; values outside the attribute's range are flagged, not saved; the engine and its version are recorded.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("datasheet reader", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let categoryId = "";
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava", "supplier");
    const [cat] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "systems", slug: `ds-${String(Date.now())}`, label: "Datasheet compressors" })
      .returning();
    categoryId = cat?.id ?? "";
    await h.db.insert(schema.catalogueAttributes).values([
      {
        categoryId,
        key: "flow_rate",
        label: "Flow rate",
        type: "number",
        unit: "Nm³/h",
        min: 1,
        max: 5000,
        displayGroup: "Performance",
      },
      {
        categoryId,
        key: "discharge",
        label: "Discharge pressure",
        type: "number",
        unit: "bar",
        min: 1,
        max: 1000,
        displayGroup: "Performance",
      },
      {
        categoryId,
        key: "weight",
        label: "Weight",
        type: "number",
        unit: "kg",
        min: 1,
        max: 100000,
        displayGroup: "Physical",
      },
    ]);
  });
  afterAll(async () => {
    useDatasheetReader(fakeDatasheetReader);
    await h.pool.end();
  });

  async function pdf() {
    const [f] = await h.db
      .insert(schema.files)
      .values({
        kind: "datasheet",
        status: "Available",
        uploadedBy: a.admin.id,
        organisationId: a.org.id,
        name: "PDC-500-datasheet.pdf",
        declaredType: "application/pdf",
        declaredBytes: 1000,
        quarantineKey: `q/${String(Math.random())}`,
        bucket: "private",
        objectKey: `o/${String(Math.random())}`,
      })
      .returning();
    return f?.id ?? "";
  }

  it("reads with confidences, flags impossible values and waits for the supplier's checks", async () => {
    useDatasheetReader({
      extract: () =>
        Promise.resolve({
          engine: "test-engine",
          version: "2.1",
          region: "ap-south-1",
          fields: [
            { attributeKey: "name", value: "PDC-500 diaphragm compressor", score: 0.99 },
            {
              attributeKey: "flow_rate",
              value: 120,
              unit: "Nm³/h",
              score: 0.98,
              sourcePage: 2,
              sourceText: "Flow rate 120 Nm³/h",
            },
            { attributeKey: "discharge", value: 5000, unit: "bar", score: 0.95, sourceText: "Discharge 500 bar g" },
            {
              attributeKey: "weight",
              value: 3200,
              unit: "kg",
              score: 0.3,
              sourcePage: 2,
              sourceText: "Weight (approx.) 3 200 kg",
            },
          ],
        }),
    });
    const actor = await loadActor(h.db, a.admin.id);
    const { id } = await startExtraction(h.db, actor, a.org.id, { fileId: await pdf(), categoryId });
    expect(await runExtraction(h.db, id)).toBe("done");
    const x = await getExtraction(h.db, scopeFor(actor), a.org.id, id);
    expect(x).toMatchObject({ status: "Ready", engine: "test-engine", engineVersion: "2.1", region: "ap-south-1" });
    const by = Object.fromEntries((x?.fields ?? []).map((f) => [f.attributeKey, f]));
    expect(by.flow_rate?.confidence).toBe("high");
    expect(by.weight?.confidence).toBe("low");
    // 5000 bar is outside the attribute's range: flagged, and can't be accepted as read.
    expect(by.discharge?.problem).toBeTruthy();
    await expect(decideField(h.db, actor, a.org.id, { id, key: "discharge", state: "accepted" })).rejects.toThrow();
    await expect(
      decideField(h.db, actor, a.org.id, { id, key: "discharge", state: "edited", value: 9999 }),
    ).rejects.toThrow();

    await expect(submitExtraction(h.db, actor, a.org.id, { id, name: "PDC-500" })).rejects.toThrow(
      "Check 2 more fields",
    );
    await decideField(h.db, actor, a.org.id, { id, key: "discharge", state: "edited", value: 500 });
    await decideField(h.db, actor, a.org.id, { id, key: "weight", state: "absent" });
    const done = await submitExtraction(h.db, actor, a.org.id, {
      id,
      name: "PDC-500 diaphragm compressor",
      model: "PDC-500",
    });
    const [product] = await h.db.select().from(schema.products).where(eq(schema.products.id, done.productId));
    expect(product?.attributes).toEqual({ flow_rate: 120, discharge: 500 });
    expect(product?.status).toBe("Draft"); // no lead time yet: the editor asks for commercial terms
    const log = await h.db.select().from(schema.auditLog).where(eq(schema.auditLog.resourceId, id));
    expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["datasheet.read", "datasheet.submitted"]));
  });

  it("supplier B can't see supplier A's datasheet", async () => {
    const b = await makeCompany(h.db, "Bharat", "supplier");
    const actor = await loadActor(h.db, a.admin.id);
    useDatasheetReader(fakeDatasheetReader);
    const { id } = await startExtraction(h.db, actor, a.org.id, { fileId: await pdf(), categoryId });
    expect(await getExtraction(h.db, scopeFor(await loadActor(h.db, b.admin.id)), a.org.id, id)).toBeNull();
    await expect(
      decideField(h.db, await loadActor(h.db, b.admin.id), a.org.id, { id, key: "weight", state: "absent" }),
    ).rejects.toThrow("Not allowed");
  });
});
