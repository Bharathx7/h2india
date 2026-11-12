import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import type { SearchDocument } from "./documents";

// Company documents for search (step 5.2): the public profile basics (481:8, A38), the same companies the directory
// lists. Only profile fields go in: never GSTINs, PANs, addresses, people or documents. Sample profiles (F9) only where
// sample content is switched on.

const { organisations: o, companyProfiles: p } = schema;

export interface CompanyDocument extends SearchDocument {
  name: string;
  legalName: string;
  types: string[];
  categories: string[];
  summary: string;
  city: string;
  state: string;
  verified: boolean;
  claimStatus: string;
  initials: string;
}

/** "HS" for Hydrotek Systems (the logo square on the org card, 477:324). */
export function initialsOf(name: string): string {
  const words = name
    .replace(/\b(pvt|private|ltd|limited|llp|inc)\b\.?/gi, "")
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w));
  return (
    words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export async function companyDocuments(
  db: Executor,
  opts: { includeSample: boolean; ids?: string[] },
): Promise<CompanyDocument[]> {
  const where: (SQL | undefined)[] = [isNull(o.deletedAt)];
  if (!opts.includeSample) where.push(eq(p.sample, false));
  if (opts.ids) {
    if (!opts.ids.length) return [];
    where.push(inArray(o.id, opts.ids));
  }
  const rows = await db
    .select({
      id: o.id,
      legalName: o.legalName,
      state: o.state,
      verification: o.verification,
      slug: p.slug,
      tradeName: p.tradeName,
      types: p.types,
      categories: p.categories,
      summary: p.summary,
      city: p.city,
      claimStatus: p.claimStatus,
    })
    .from(p)
    .innerJoin(o, eq(o.id, p.organisationId))
    .where(and(...where));
  return rows.map((r) => {
    const verified = r.verification === "Verified";
    const place = [r.city, r.state].filter(Boolean).join(", ");
    return {
      id: r.id,
      title: r.tradeName,
      meta: [r.types[0], place, verified ? "Verified" : null].filter(Boolean).join(" · "),
      href: `/directory/companies/${r.slug}`,
      name: r.tradeName,
      legalName: r.legalName,
      types: r.types,
      categories: r.categories,
      summary: r.summary ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      verified,
      claimStatus: r.claimStatus,
      initials: initialsOf(r.tradeName),
    };
  });
}
