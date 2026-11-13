import { schema, type Executor } from "@h2india/db";
import { and, asc, isNull } from "drizzle-orm";
import type { ClassId } from "./taxonomy";

// What buyers see of the catalogue (step 6.2): classes, categories and applications, without hidden ones, and
// without sample ones unless sample content is on (F9). Counts are live listings: products arrive in step 8.3, so
// until then every count is 0 and pages leave product counts out (A109).

export interface PublicCategory {
  id: string;
  slug: string;
  label: string;
  classId: ClassId;
  parentId: string | null;
  liveProducts: number;
  children: PublicCategory[];
  applicationIds: string[];
}

export interface PublicClass {
  id: ClassId;
  label: string;
  description: string;
  liveProducts: number;
  categories: PublicCategory[];
}

export interface PublicApplication {
  id: string;
  label: string;
  shortLabel: string;
  examples: string;
  liveProducts: number;
  categoryIds: string[];
}

export interface PublicCatalogue {
  classes: PublicClass[];
  applications: PublicApplication[];
}

export async function publicCatalogue(db: Executor, opts: { includeSample: boolean }): Promise<PublicCatalogue> {
  const cat = schema.catalogueCategories;
  const app = schema.catalogueApplications;
  const [classes, rows, apps, links] = await Promise.all([
    db.select().from(schema.catalogueClasses).orderBy(asc(schema.catalogueClasses.position)),
    db
      .select()
      .from(cat)
      .where(and(isNull(cat.deletedAt), isNull(cat.hiddenAt)))
      .orderBy(asc(cat.position), asc(cat.label)),
    db.select().from(app).where(isNull(app.hiddenAt)).orderBy(asc(app.position)),
    db.select().from(schema.catalogueCategoryApplications),
  ]);
  const visible = rows.filter((r) => opts.includeSample || !r.sample);
  const ids = new Set(visible.map((r) => r.id));
  // A sub-category of a hidden or missing category is not shown either.
  const shown = visible.filter((r) => r.parentId === null || ids.has(r.parentId));
  const appsOf = (id: string) => links.filter((l) => l.categoryId === id).map((l) => l.applicationId);
  const node = (r: (typeof rows)[number]): PublicCategory => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    classId: r.classId as ClassId,
    parentId: r.parentId,
    liveProducts: 0,
    applicationIds: appsOf(r.id),
    children: shown.filter((c) => c.parentId === r.id).map(node),
  });
  const top = shown.filter((r) => r.parentId === null).map(node);
  const shownIds = new Set(shown.map((r) => r.id));
  return {
    classes: classes.map((c) => ({
      id: c.id as ClassId,
      label: c.label,
      description: c.description,
      liveProducts: 0,
      categories: top.filter((t) => t.classId === c.id),
    })),
    applications: apps.map((a) => ({
      id: a.id,
      label: a.label,
      shortLabel: a.shortLabel,
      examples: a.examples,
      liveProducts: 0,
      categoryIds: links.filter((l) => l.applicationId === a.id && shownIds.has(l.categoryId)).map((l) => l.categoryId),
    })),
  };
}
