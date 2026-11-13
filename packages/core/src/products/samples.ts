import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";
import { checkAttributeValues } from "../catalogue/attributes";
import { effectiveSchema } from "../catalogue/taxonomy";

// Sample products for local and staging (steps 6.3 and 6.4, F9): the PEM electrolysers in the sub-category table
// (392:5787) with the Electrolysers attributes drawn on its filter panel (392:5007). Flagged sample, so production never
// shows them. Every product is checked against its category's schema like a real one. Safe to run again.

const ELECTROLYSER_ATTRIBUTES = [
  { key: "h2_output", label: "H₂ output", type: "number", unit: "kg/day", min: 1, max: 100000, group: "Performance" },
  { key: "rated_power", label: "Rated power", type: "number", unit: "kW", min: 1, max: 1000000, group: "Performance" },
  {
    key: "output_pressure",
    label: "Output pressure",
    type: "number",
    unit: "bar(g)",
    min: 0,
    max: 1000,
    group: "Performance",
  },
  {
    key: "specific_energy",
    label: "Specific energy",
    type: "number",
    unit: "kWh/kg",
    min: 30,
    max: 80,
    group: "Performance",
    test: "At rated load, beginning of life",
  },
  { key: "purity", label: "Purity", type: "choice", options: ["99.9%", "99.99%", "99.999%"], group: "Gas quality" },
  {
    key: "readiness",
    label: "Readiness",
    type: "choice",
    options: ["TRL 9 · commercial", "TRL 7–8 · demonstration"],
    group: "Physical",
  },
] as const;

/** [name, variant, supplier key, output kg/day, power kW, pressure, kWh/kg, lead min, lead max] as drawn on 392:5787. */
const PEM: [string, string, string, number, number, number, number, number, number][] = [
  ["PEM Electrolyser 1 MW", "Containerised · 40 ft", "sahyadri-electrolysers", 450, 1000, 30, 52.5, 14, 16],
  ["PEM Stack Module 500 kW", "Skid-mounted", "konkan-hydrogen-tech", 220, 500, 35, 53, 10, 12],
  ["Containerised PEM 2 MW", "2 × 40 ft", "sahyadri-electrolysers", 900, 2000, 30, 52, 18, 20],
  ["PEM Electrolyser 250 kW", "Skid-mounted", "godavari-green-power", 108, 250, 30, 54, 12, 12],
  ["PEM Electrolyser 100 kW", "Indoor cabinet", "godavari-green-power", 43, 100, 30, 55, 8, 8],
  ["PEM Electrolyser 5 MW", "Modular blocks", "konkan-hydrogen-tech", 2250, 5000, 30, 51.5, 24, 24],
  ["PEM Electrolyser 50 kW", "Lab and pilot", "pranava-h2", 21, 50, 15, 56, 6, 6],
  ["High-pressure PEM 1 MW", "70 bar output", "kaveri-electrochem", 450, 1000, 70, 54.5, 20, 20],
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function seedProductSamples(db: Executor, now = new Date()): Promise<string> {
  const cat = schema.catalogueCategories;
  const attr = schema.catalogueAttributes;
  const [electrolysers] = await db
    .select()
    .from(cat)
    .where(and(eq(cat.slug, "electrolysers"), isNull(cat.parentId), isNull(cat.deletedAt)))
    .limit(1);
  const [pem] = electrolysers
    ? await db
        .select()
        .from(cat)
        .where(and(eq(cat.slug, "pem"), eq(cat.parentId, electrolysers.id), isNull(cat.deletedAt)))
        .limit(1)
    : [];
  if (!electrolysers || !pem) return "products: run the catalogue samples first";

  const existing = new Set(
    (await db.select({ key: attr.key }).from(attr).where(eq(attr.categoryId, electrolysers.id))).map((a) => a.key),
  );
  let position = existing.size;
  for (const a of ELECTROLYSER_ATTRIBUTES) {
    if (existing.has(a.key)) continue;
    position += 1;
    await db.insert(attr).values({
      categoryId: electrolysers.id,
      key: a.key,
      label: a.label,
      type: a.type,
      unit: "unit" in a ? a.unit : null,
      min: "min" in a ? a.min : null,
      max: "max" in a ? a.max : null,
      options: "options" in a ? [...a.options] : [],
      required: a.type === "number",
      filterable: true,
      comparable: a.type === "number",
      testCondition: "test" in a ? a.test : null,
      displayGroup: a.group,
      position,
      sample: true,
    });
  }

  const defs = await effectiveSchema(db, pem.id, { includeSample: true });
  const p = schema.products;
  let added = 0;
  const skipped: string[] = [];
  for (const [i, [name, variant, supplier, output, power, pressure, energy, leadMin, leadMax]] of PEM.entries()) {
    const slug = slugify(name);
    const [found] = await db.select({ id: p.id }).from(p).where(eq(p.slug, slug)).limit(1);
    if (found) continue;
    const [profile] = await db
      .select({ organisationId: schema.companyProfiles.organisationId })
      .from(schema.companyProfiles)
      .where(eq(schema.companyProfiles.importKey, supplier))
      .limit(1);
    if (!profile) continue;
    const attributes = {
      h2_output: output,
      rated_power: power,
      output_pressure: pressure,
      specific_energy: energy,
      purity: pressure >= 35 ? "99.999%" : "99.99%",
      readiness: power <= 50 ? "TRL 7–8 · demonstration" : "TRL 9 · commercial",
    };
    const checked = checkAttributeValues(defs, attributes);
    // An operator may have added a required attribute since; such a sample is skipped and named, never forced in.
    if (!checked.ok) {
      skipped.push(`${name} (${Object.values(checked.errors).join("; ")})`);
      continue;
    }
    await db.insert(p).values({
      organisationId: profile.organisationId,
      categoryId: pem.id,
      slug,
      name,
      variant,
      brand: null,
      model: null,
      summary: null,
      attributes: checked.value,
      certifications: i % 3 === 2 ? ["IEC 62282"] : ["ISO 22734"],
      pricing: "quote",
      leadTimeMinWeeks: leadMin,
      leadTimeMaxWeeks: leadMax,
      madeInIndia: supplier !== "kaveri-electrochem",
      status: "Live",
      publishedAt: new Date(now.getTime() - i * 86_400_000),
      sample: true,
    });
    added += 1;
  }
  return `products: ${String(added)} sample products added${skipped.length ? `; skipped ${skipped.join(", ")}` : ""}`;
}
