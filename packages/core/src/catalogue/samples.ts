import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";

// Sample sub-categories for local and staging (step 6.1, F9): the examples the frames draw that M23 does not confirm
// for launch. Electrolyser technologies from the filter panel (392:5007) and the other compressor types from the
// Taxonomy tree (636:596). Flagged sample, so they show only with FLAG_SAMPLE_CONTENT. Safe to run again.

const SAMPLES: { parent: string; children: [slug: string, label: string][] }[] = [
  {
    parent: "electrolysers",
    children: [
      ["alkaline", "Alkaline"],
      ["pem", "PEM"],
      ["aem", "AEM"],
      ["solid-oxide", "Solid oxide"],
    ],
  },
  {
    parent: "compression-systems",
    children: [
      ["piston", "Piston"],
      ["screw", "Screw"],
      ["centrifugal", "Centrifugal"],
    ],
  },
];

export async function seedCatalogueSamples(db: Executor): Promise<string> {
  const cat = schema.catalogueCategories;
  let added = 0;
  for (const group of SAMPLES) {
    const [parent] = await db
      .select()
      .from(cat)
      .where(and(eq(cat.slug, group.parent), isNull(cat.parentId), isNull(cat.deletedAt)))
      .limit(1);
    if (!parent) continue;
    const existing = await db
      .select({ slug: cat.slug, position: cat.position })
      .from(cat)
      .where(eq(cat.parentId, parent.id));
    let position = Math.max(0, ...existing.map((e) => e.position));
    for (const [slug, label] of group.children) {
      if (existing.some((e) => e.slug === slug)) continue;
      position += 1;
      await db
        .insert(cat)
        .values({ classId: parent.classId, parentId: parent.id, slug, label, position, sample: true });
      added += 1;
    }
  }
  return `catalogue: ${String(added)} sample sub-categories added`;
}
