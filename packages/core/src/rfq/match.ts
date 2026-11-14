import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

// Choose suppliers (wizard step 2, 398:9635): verified supplier companies that list live products in the chosen
// category or its sub-categories, with the reasons they match. Only verified companies are ever offered (the RFQ
// promise is "verified suppliers"); with no category, every verified supplier is offered.

export interface SupplierMatch {
  organisationId: string;
  name: string;
  slug: string | null;
  place: string;
  reasons: string[];
}

export async function matchSuppliers(
  db: Executor,
  input: { categoryId?: string | null; state?: string | null; includeSample: boolean; limit?: number },
): Promise<SupplierMatch[]> {
  const o = schema.organisations;
  const cp = schema.companyProfiles;
  const p = schema.products;
  const c = schema.catalogueCategories;
  const verified = await db
    .select({
      id: o.id,
      state: o.state,
      legalName: o.legalName,
      name: cp.tradeName,
      slug: cp.slug,
      city: cp.city,
      sample: cp.sample,
    })
    .from(o)
    .leftJoin(cp, eq(cp.organisationId, o.id))
    .where(and(inArray(o.kind, ["supplier", "both"]), eq(o.verification, "Verified")));
  const shown = verified.filter((v) => input.includeSample || !v.sample);
  if (!shown.length) return [];
  let label: string | null = null;
  let counts = new Map<string, number>();
  if (input.categoryId) {
    const [cat] = await db.select({ id: c.id, label: c.label }).from(c).where(eq(c.id, input.categoryId));
    label = cat?.label ?? null;
    const subs = await db
      .select({ id: c.id })
      .from(c)
      .where(and(eq(c.parentId, input.categoryId), isNull(c.deletedAt)));
    const ids = [input.categoryId, ...subs.map((x) => x.id)];
    const rows = await db
      .select({ org: p.organisationId })
      .from(p)
      .where(and(inArray(p.categoryId, ids), eq(p.status, "Live"), isNull(p.deletedAt)));
    counts = rows.reduce((m, r) => m.set(r.org, (m.get(r.org) ?? 0) + 1), new Map<string, number>());
  }
  const list = shown
    .filter((v) => !input.categoryId || counts.has(v.id))
    .map((v) => {
      const reasons: string[] = [];
      const n = counts.get(v.id) ?? 0;
      if (label && n) reasons.push(`Lists ${label.toLowerCase()}`);
      if (n > 1) reasons.push(`${String(n)} listed`);
      if (input.state && v.state === input.state) reasons.push("Same state as site");
      return {
        organisationId: v.id,
        name: v.name ?? v.legalName,
        slug: v.slug,
        place: [v.city, v.state].filter(Boolean).join(", "),
        reasons,
      };
    })
    .sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name, "en-IN"));
  return list.slice(0, input.limit ?? 12);
}
