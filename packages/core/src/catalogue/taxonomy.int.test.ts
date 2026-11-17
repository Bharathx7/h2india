import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { checkAttributeValues, type AttributeInput } from "./attributes";
import { seedCatalogueSamples } from "./samples";
import {
  addApplication,
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
  moveSubCategory,
  productsUsingAttribute,
  removeAttribute,
  reorderCategory,
  setApplicationHidden,
  setCategoryHidden,
  updateApplication,
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

    // All seven applications show since A105.
    const apps = await catalogueApplications(h.db);
    expect(apps.map((a) => a.id)).toContain("ports-shipping");
    expect(apps).toHaveLength(7);

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

  it("counts live products and locks an attribute products use (founder QC, A107)", async () => {
    const { actor } = await operator("Catalogue moderator");
    const parentId = await newCategory(actor);
    const child = await addCategory(h.db, actor, { classId: "equipment", parentId, label: "Benchtop" });
    if (!child.ok) throw new Error("no child");
    const onParent = await addAttribute(h.db, actor, parentId, noise());
    if (!onParent.ok) throw new Error("not added");
    const supplier = await makeCompany(h.db, "Catalogue counts", "supplier");
    await h.db.insert(schema.products).values({
      organisationId: supplier.org.id,
      categoryId: child.value.id,
      slug: `bench-${tag()}`,
      name: "Bench",
      status: "Live",
      publishedAt: new Date(),
      attributes: { noise_level: 60 },
    });
    // The sub-category's product counts for the parent, and uses the parent's attribute it inherits.
    const parent = await categoryDetail(h.db, actor, parentId);
    expect(parent?.liveProducts).toBe(1);
    expect(parent?.attributes[0]?.inUse).toBe(1);
    expect(await productsUsingAttribute(h.db, { categoryId: parentId, key: "noise_level" })).toBe(1);
    const node = (await catalogueTree(h.db, actor))
      .find((k) => k.id === "equipment")
      ?.categories.find((x) => x.id === parentId);
    expect(node).toMatchObject({ liveProducts: 1, attributes: 1 });
    expect(node?.children[0]).toMatchObject({ liveProducts: 1, attributes: 0 });
    const sub = await categoryDetail(h.db, actor, child.value.id);
    expect(sub?.inherited.map((a) => a.key)).toEqual(["noise_level"]);
    // Locked: no new type or unit, no removal; other edits are fine.
    expect(await updateAttribute(h.db, actor, onParent.value.id, noise({ unit: "dB" }))).toMatchObject({ ok: false });
    await expect(removeAttribute(h.db, actor, onParent.value.id)).rejects.toThrow("can't be removed");
    expect(await updateAttribute(h.db, actor, onParent.value.id, noise({ required: true }))).toMatchObject({
      ok: true,
    });
  });

  it("moves a sub-category under another category and reorders siblings", async () => {
    const { actor } = await operator("Catalogue moderator");
    const a = await newCategory(actor);
    const b = await newCategory(actor);
    const child = await addCategory(h.db, actor, { classId: "equipment", parentId: a, label: "Portable" });
    if (!child.ok) throw new Error("no child");
    expect(await moveSubCategory(h.db, actor, child.value.id, child.value.id)).toMatchObject({ ok: false });
    expect(await moveSubCategory(h.db, actor, child.value.id, b)).toEqual({ ok: true, value: null });
    expect((await categoryDetail(h.db, actor, child.value.id))?.parentId).toBe(b);
    expect(await moveSubCategory(h.db, actor, a, b)).toMatchObject({ ok: false });

    const second = await addCategory(h.db, actor, { classId: "equipment", parentId: b, label: "Fixed" });
    if (!second.ok) throw new Error("no second");
    await reorderCategory(h.db, actor, second.value.id, "up");
    const kids = (await catalogueTree(h.db, actor))
      .find((k) => k.id === "equipment")
      ?.categories.find((x) => x.id === b)?.children;
    expect(kids?.map((k) => k.label)).toEqual(["Fixed", "Portable"]);
  });

  it("adds applications hidden, renames them and shows them, audited", async () => {
    const { actor } = await operator("Catalogue moderator");
    const { actor: viewer } = await operator("Finance");
    const short = `Rail ${tag()}`;
    await expect(addApplication(h.db, viewer, { label: "x", shortLabel: "y", examples: "" })).rejects.toThrow(
      "Not allowed",
    );
    expect(await addApplication(h.db, actor, { label: "", shortLabel: "", examples: "" })).toMatchObject({ ok: false });
    const added = await addApplication(h.db, actor, {
      label: `Hydrogen rail ${short}`,
      shortLabel: short,
      examples: "",
    });
    if (!added.ok) throw new Error("not added");
    expect(await addApplication(h.db, actor, { label: "Again", shortLabel: short, examples: "" })).toMatchObject({
      ok: false,
    });
    const find = async () =>
      (await catalogueApplications(h.db, { includeHidden: true })).find((x) => x.id === added.value.id);
    expect(await find()).toMatchObject({ hidden: true });
    expect((await catalogueApplications(h.db)).some((x) => x.id === added.value.id)).toBe(false);
    await updateApplication(h.db, actor, added.value.id, {
      label: "Rail and ports",
      shortLabel: short,
      examples: "Locomotives",
    });
    await setApplicationHidden(h.db, actor, added.value.id, false);
    expect(await find()).toMatchObject({ label: "Rail and ports", examples: "Locomotives", hidden: false });
    const log = await h.db
      .select({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(eq(schema.auditLog.resourceId, added.value.id));
    expect(log.map((l) => l.action).sort()).toEqual([
      "catalogue.application.added",
      "catalogue.application.changed",
      "catalogue.application.shown",
    ]);
  });
});
