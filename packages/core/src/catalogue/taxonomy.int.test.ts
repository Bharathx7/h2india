import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { makeUser, useTestEnv } from "../testing/factory";
import { checkAttributeValues, type AttributeInput } from "./attributes";
import { seedCatalogueSamples } from "./samples";
import {
  addAttribute,
  addCategory,
  catalogueApplications,
  catalogueTree,
  categoryDetail,
  categoryHistory,
  categorySchema,
  duplicateCategory,
  filterableAttributes,
  moveCategory,
  setCategoryHidden,
  updateAttribute,
} from "./taxonomy";

// Step 6.1 DONE WHEN: an operator can add an attribute and it appears as a filter without a deploy; a product with a
// value outside an attribute's range is rejected with a clear message; the seeded examples are flagged sample.
const url = process.env.TEST_DATABASE_URL;

const noise = (over: Partial<AttributeInput> = {}): AttributeInput => ({
  label: "Noise level",
  type: "number",
  unit: "dB(A)",
  allowedValues: "40–110",
  displayGroup: "Physical",
  required: false,
  filterable: true,
  comparable: false,
  askTestCondition: true,
  testCondition: "At 1 m",
  ...over,
});

describe.skipIf(!url)("catalogue taxonomy", () => {
  let h: DbHandle;
  const tag = () => randomBytes(3).toString("hex");

  const operator = async (role: string) => {
    const user = await makeUser(h.db, `Catalogue ${role}`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: user.id, roleId: r?.id ?? "" });
    return { user, actor: await loadActor(h.db, user.id) };
  };

  const newCategory = async (actor: Awaited<ReturnType<typeof operator>>["actor"], classId = "equipment") => {
    const made = await addCategory(h.db, actor, { classId, label: `Test benches ${tag()}` });
    if (!made.ok) throw new Error(JSON.stringify(made.errors));
    return made.value.id;
  };

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("starts with the launch catalogue from M23", async () => {
    const { actor } = await operator("Catalogue moderator");
    const tree = await catalogueTree(h.db, actor);
    expect(tree.map((c) => c.label)).toEqual(["Systems", "Components", "Equipment", "Services", "Materials"]);
    const systems = tree[0]?.categories.filter((c) => !c.label.startsWith("Test")).map((c) => c.label) ?? [];
    expect(systems.slice(0, 3)).toEqual(["Electrolysers", "Fuel cell systems", "Compression systems"]);

    const apps = await catalogueApplications(h.db);
    expect(apps).toHaveLength(6);
    expect(apps.map((a) => a.id)).not.toContain("ports-shipping");
    expect(await catalogueApplications(h.db, { includeHidden: true })).toHaveLength(7);

    const compression = tree[0]?.categories.find((c) => c.slug === "compression-systems");
    const diaphragm = compression?.children.find((c) => c.slug === "diaphragm");
    expect(diaphragm?.sample).toBe(false);
    const defs = await categorySchema(h.db, diaphragm?.id ?? "");
    expect(defs.slice(0, 10).map((d) => d.label)).toEqual([
      "Flow rate",
      "Suction pressure",
      "Discharge pressure",
      "Motor power",
      "Hydrogen purity",
      "Lubrication",
      "Cooling",
      "Weight",
      "Footprint",
      "Noise level",
    ]);
    // A product outside the drawn range is refused with a message naming the attribute, the range and the unit.
    const r = checkAttributeValues(defs, {
      flow_rate: 9000,
      suction_pressure: { min: 20, max: 30 },
      discharge_pressure: 500,
      motor_power: 75,
      hydrogen_purity: 99.999,
      lubrication: "Oil-free",
    });
    expect(r.ok ? null : r.errors).toEqual({ flow_rate: "Flow rate must be between 1 and 5,000 Nm³/h" });
  });

  it("adds an attribute that is a filter at once, with history and an audit entry", async () => {
    const { user, actor } = await operator("Catalogue moderator");
    const categoryId = await newCategory(actor);
    const added = await addAttribute(h.db, actor, categoryId, noise(), { context: { requestId: "req-61" } });
    expect(added).toMatchObject({ ok: true, value: { key: "noise_level" } });

    // No deploy: the next read of the schema has it, as a filter.
    expect((await filterableAttributes(h.db, categoryId)).map((d) => d.key)).toEqual(["noise_level"]);

    const detail = await categoryDetail(h.db, actor, categoryId);
    expect(detail?.attributes[0]).toMatchObject({ label: "Noise level", min: 40, max: 110, isNew: true });
    expect(detail?.lastChange?.summary).toBe("added Noise level (dB(A), test condition: at 1 m, optional)");
    expect(detail?.lastChange?.who).toBe(user.name);

    const [entry] = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "catalogue.attribute.added"), eq(auditLog.actorId, user.id)))
      .orderBy(desc(auditLog.at))
      .limit(1);
    expect(entry).toMatchObject({ resourceType: "catalogue_attribute", requestId: "req-61" });

    // The same name twice is refused with the dialog's words.
    const twice = await addAttribute(h.db, actor, categoryId, noise({ label: "noise level" }));
    expect(twice).toEqual({
      ok: false,
      errors: { label: "This category already has an attribute called noise level" },
    });
  });

  it("describes edits in plain words and keeps the key", async () => {
    const { actor } = await operator("Catalogue moderator");
    const categoryId = await newCategory(actor);
    const added = await addAttribute(
      h.db,
      actor,
      categoryId,
      noise({ label: "Capacity", unit: "kg/day", allowedValues: "1–100", askTestCondition: false, filterable: false }),
    );
    if (!added.ok) throw new Error("not added");
    const edited = await updateAttribute(
      h.db,
      actor,
      added.value.id,
      noise({ label: "Flow rate", unit: "Nm³/h", allowedValues: "1–100", askTestCondition: false, filterable: true }),
    );
    expect(edited).toEqual({ ok: true, value: { changed: true } });
    const [latest] = await categoryHistory(h.db, actor, categoryId, 1);
    expect(latest?.summary).toBe("renamed Capacity to Flow rate, set the unit to Nm³/h and made it filterable");
    expect((await categorySchema(h.db, categoryId))[0]).toMatchObject({ key: "capacity", label: "Flow rate" });
  });

  it("lets only operators with catalogue edit access change the schema", async () => {
    const { actor: editor } = await operator("Content editor");
    const { actor: moderator } = await operator("Catalogue moderator");
    const categoryId = await newCategory(moderator);
    await expect(addAttribute(h.db, editor, categoryId, noise())).rejects.toThrow("Not allowed");
    await expect(catalogueTree(h.db, editor)).rejects.toThrow("Not allowed");
    // Finance may look (656:8) but not change.
    const { actor: finance } = await operator("Finance");
    expect(await categoryDetail(h.db, finance, categoryId)).not.toBeNull();
    await expect(setCategoryHidden(h.db, finance, categoryId, true)).rejects.toThrow("Not allowed");
  });

  it("keeps the tree to two levels and moves, hides and copies categories", async () => {
    const { actor } = await operator("Catalogue moderator");
    const parentId = await newCategory(actor);
    const child = await addCategory(h.db, actor, { classId: "equipment", parentId, label: "Hydrostatic" });
    if (!child.ok) throw new Error("no child");
    expect(await addCategory(h.db, actor, { classId: "equipment", parentId: child.value.id, label: "Deeper" })).toEqual(
      {
        ok: false,
        errors: { parentId: "Sub-categories can't have their own sub-categories" },
      },
    );
    await addAttribute(h.db, actor, child.value.id, noise());

    expect(await moveCategory(h.db, actor, parentId, "services")).toEqual({ ok: true, value: null });
    const [moved] = await h.db
      .select({ classId: schema.catalogueCategories.classId })
      .from(schema.catalogueCategories)
      .where(eq(schema.catalogueCategories.id, child.value.id));
    expect(moved?.classId).toBe("services");

    await setCategoryHidden(h.db, actor, child.value.id, true);
    expect((await categoryDetail(h.db, actor, child.value.id))?.hidden).toBe(true);

    const copy = await duplicateCategory(h.db, actor, child.value.id);
    const copied = await categoryDetail(h.db, actor, copy.id);
    expect(copied).toMatchObject({ label: "Hydrostatic (copy)", hidden: true, parentId });
    expect(copied?.attributes.map((a) => a.key)).toEqual(["noise_level"]);
  });

  it("adds the design's sample sub-categories once, flagged sample", async () => {
    await seedCatalogueSamples(h.db);
    await seedCatalogueSamples(h.db);
    const c = schema.catalogueCategories;
    const [electrolysers] = await h.db
      .select()
      .from(c)
      .where(and(eq(c.slug, "electrolysers"), isNull(c.parentId), isNull(c.deletedAt)));
    const pem = await h.db
      .select()
      .from(c)
      .where(and(eq(c.slug, "pem"), eq(c.parentId, electrolysers?.id ?? ""), isNull(c.deletedAt)));
    expect(pem).toHaveLength(1);
    expect(pem[0]?.sample).toBe(true);
  });
});
